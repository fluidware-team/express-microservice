/*
 * Copyright Fluidware srl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Config, MicroServiceConfig, MicroServiceOptions } from './config';
import { Logger } from 'pino';
import { context, trace } from '@opentelemetry/api';
import { Request, Response, Express, NextFunction } from 'express';
import * as express from 'express';
import * as OpenApiValidator from 'express-openapi-validator';
import { HTTPError } from './HTTPError';
import {
  getAsyncLocalStorage,
  getAsyncLocalStorageProp,
  getAsyncLocalStorageStore,
  getLogger,
  setAsyncLocalStorageProp,
  Store,
  StoreSymbols
} from '@fluidware-it/saddlebag';
import * as http from 'http';
import * as https from 'https';
import { JwtPayload, verify } from 'jsonwebtoken';
import * as fs from 'fs';

export const MicroServiceStoreSymbols = {
  NO_LOG: Symbol('fw.no_log'),
  CONSUMER: Symbol('fw.consumer')
};

export interface ConsumerDef {
  name: string;
  type: string;
  roles: string[];
  attr: { [key: string]: string };
}

export class Microservice {
  private config: MicroServiceConfig;
  protected readonly express: Express;
  protected logger: Logger;
  protected srv?: http.Server | https.Server;

  constructor(config?: MicroServiceOptions) {
    if (config) {
      this.config = Object.assign(Config, config);
    } else {
      this.config = Config;
    }
    this.logger = getLogger();
    this.express = express();
    this.setupExpress();
  }

  private setupExpress(): void {
    this.express.disable('x-powered-by');
    this.express.set('trust proxy', this.config.trustProxy);
    this.setupInitialMiddlewares();
    this.express.use(this.instrument);
    const appKeysCount = Object.keys(this.config.appKeys).length;
    if (this.config.jwtPublicKey && !this.config.preSharedTokenPrefix && appKeysCount > 0) {
      this.logger.error(
        'you have configured FW_MS_JWT_PUBLIC_KEY but not FW_MS_PRE_SHARED_TOKEN_PREFIX, no app key will match'
      );
    }
    if (appKeysCount > 0) {
      this.express.use((req: Request, res: Response, next: NextFunction) => {
        this.preSharedTokenMiddleware(req, res, next);
      });
    }
    if (this.config.jwtPublicKey) {
      this.express.use(this.jwtMiddleware(this.config.jwtPublicKey));
    }
    this.setupPreLoggerMiddlewares();
    this.express.use(this.requestLogger);

    this.setupPreBodyParsersMiddlewares();
    this.setupBodyParsersMiddlewares();
    this.setupPostBodyParsersMiddlewares();

    this.setupParams();
    this.setupRoutes();

    this.express.use(this.noRouteMatch);

    // Error handler
    // Note: we go through some acrobatics to make sure the arity of the
    // function passed to use() is 4.

    // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
    const errorHandlerWrap = (err: HTTPError, req: Request, res: Response, next: NextFunction) => {
      this.errorHandler(err, req, res);
    };
    this.express.use(errorHandlerWrap);
  }

  setupInitialMiddlewares(): void {}

  setupPreLoggerMiddlewares(): void {}

  setupPreBodyParsersMiddlewares(): void {}

  setupBodyParsersMiddlewares(): void {
    this.express.use(express.json({ limit: this.config.maxUploadSize }));
  }

  setupPostBodyParsersMiddlewares(): void {}

  setupParams(): void {}

  setupRoutes(): void {}

  async start() {
    await this.preStartNetwork();
    const { address, port } = await this.startNetwork();
    await this.startCustom();
    return { address, port };
  }

  async stop() {
    await this.stopCustom();
    await this.stopNetwork();
    await this.postStopNetwork();
  }

  async startCustom() {
    // could be overridden
  }

  async stopCustom() {
    // could be overridden
  }

  async preStartNetwork() {
    // could be overridden
  }

  async postStopNetwork() {
    // Could be overridden
  }

  startNetwork(): Promise<{ port: number; address: string }> {
    return new Promise((resolve, reject) => {
      if (this.config.key) {
        const options = {
          key: this.config.key,
          cert: this.config.cert
        };
        this.srv = https.createServer(options, this.express);
      } else {
        this.srv = http.createServer(this.express);
      }
      const port = this.config.port;
      const onListening = () => {
        resolve({
          port,
          address: this.config.addresses ? this.config.addresses.join(',') : this.config.address || ''
        });
      };

      const onError = (err: Error) => {
        this.srv?.removeListener('error', onError);
        this.srv?.removeListener('listening', onListening);
        reject(err);
      };

      this.srv.on('error', onError);
      this.srv.on('listening', onListening);

      if (this.config.addresses.length > 0) {
        this.logger.info(`listen on multiple addresses ${this.config.addresses.join(',')}`);
        for (const address of this.config.addresses) {
          this.logger.info(`listen on ${this.config.address}:${port}`);
          this.srv.listen(port, address);
        }
      } else if (this.config.address) {
        this.logger.info(`listen on ${this.config.address}:${port}`);
        this.srv.listen(port, this.config.address);
      } else {
        this.logger.info(`listen on ${port}`);
        this.srv.listen(port);
      }
    });
  }

  async stopNetwork() {
    if (!this.srv) {
      return;
    }
    return new Promise((resolve, reject) => {
      const onError = (err: Error) => {
        // eslint-disable-next-line no-use-before-define
        clearListeners();
        // this.srv = null;
        reject(err);
      };

      const onClose = () => {
        // eslint-disable-next-line no-use-before-define
        clearListeners();
        // this.srv = null;
        resolve(true);
      };

      const clearListeners = () => {
        if (!this.srv) return;
        this.srv.removeListener('error', onError);
        this.srv.removeListener('close', onClose);
      };

      this.srv?.on('error', onError);
      this.srv?.on('close', onClose);

      this.srv?.close();
    });
    // If there's no server, no need to do this
  }

  instrument(req: Request, res: Response, next: NextFunction) {
    const asyncLocalStorage = getAsyncLocalStorage();
    const store = {} as Store;
    asyncLocalStorage
      .run(store, async (): Promise<void> => {
        return new Promise((resolve, reject) => {
          let completed = false;

          function onRequestEnd() {
            if (completed) return;
            completed = true;
            resolve();
          }

          res.on('error', err => {
            completed = true;
            reject(err);
          });
          res.once('finish', onRequestEnd);
          res.once('close', onRequestEnd);
          next();
        });
      })
      .catch((e: Error) => {
        getLogger().error({ error_message: e.message }, 'asyncLocalStorage run failed');
      });
  }

  static getBearerToken(req: Request) {
    const authorization = req.get('authorization');
    if (authorization) {
      const m = /^[Bb]earer\s+(\S+)$/.exec(authorization);
      if (m) {
        const [, tokenString] = m;
        return tokenString;
      }
    } else if (req.query?.access_token) {
      return req.query.access_token as string;
    }
    return null;
  }

  preSharedTokenMiddleware(req: Request, res: Response, next: NextFunction) {
    const token = Microservice.getBearerToken(req);
    if (token) {
      if (token.startsWith(this.config.preSharedTokenPrefix)) {
        const appName = this.config.appKeys[token];
        if (!appName) {
          res.status(401).json({ status: 401, reason: 'Unauthorized' });
          return;
        }
        const store = getAsyncLocalStorageStore();
        if (store === undefined) {
          next(new Error('failed to initialize request'));
          return;
        }
        const consumer: ConsumerDef = {
          name: appName,
          type: 'internal',
          roles: Config.appRoles[appName] ?? Config.appDefaultRoles,
          attr: {}
        };
        this.addConsumerToContext(consumer);
      }
    }
    next();
  }

  jwtMiddleware(jwtPublicKey: string) {
    const publicKey = fs.readFileSync(jwtPublicKey, 'utf8');
    const ms = this;
    return function jwtMiddleware(req: Request, res: Response, next: NextFunction) {
      const _consumer = getAsyncLocalStorageProp<ConsumerDef>(MicroServiceStoreSymbols.CONSUMER);
      if (_consumer) {
        next();
        return;
      }

      function getToken() {
        const authorization = req.get('authorization');
        if (authorization) {
          const m = /^[Bb]earer\s+(\S+)$/.exec(authorization);
          if (m) {
            const [, tokenString] = m;
            return tokenString;
          }
        }
        return null;
      }

      const token = getToken();
      if (token) {
        const consumerJwt = verify(token, publicKey, { algorithms: ['RS512'], complete: true });
        const consumer = (consumerJwt.payload as JwtPayload).consumer as ConsumerDef;
        if (consumer) {
          ms.addConsumerToContext(consumer);
        }
      }
      next();
    };
  }

  private addConsumerToContext(consumer: ConsumerDef) {
    setAsyncLocalStorageProp<ConsumerDef>(MicroServiceStoreSymbols.CONSUMER, consumer);
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes({
        consumer: consumer.name
      });
    }
  }

  /**
   *
   * @param apiSpec path to openapi spec file
   * @param operationHandlers path to controllers' directory
   * @param validateResponses set it to true to validate responses
   */
  useOpenapiValidatorMiddleware(apiSpec: string, operationHandlers: string, validateResponses = false): void {
    this.express.use(
      OpenApiValidator.middleware({
        apiSpec,
        validateResponses,
        operationHandlers
      })
    );
  }

  requestLogger(req: Request, res: Response, next: NextFunction) {
    const store = getAsyncLocalStorageStore();
    if (store === undefined) {
      return next(new Error('failed to initialize request'));
    }
    const consumer = getAsyncLocalStorageProp<ConsumerDef>(MicroServiceStoreSymbols.CONSUMER);
    const currentSpan = trace.getSpan(context.active());
    const weblog = getLogger().child({
      traceId: currentSpan?.spanContext().traceId,
      consumer: consumer?.name,
      component: 'web'
    });
    setAsyncLocalStorageProp(StoreSymbols.LOGGER, weblog);
    res.on('close', function () {
      if (!getAsyncLocalStorageProp<boolean>(MicroServiceStoreSymbols.NO_LOG)) {
        const rec = {
          url: req.originalUrl,
          method: req.method,
          req: req.headers,
          res: res.getHeaders(),
          statusCode: res.statusCode
        };
        return weblog.info(rec, 'http request');
      }
    });
    setImmediate(next);
  }

  errorHandler(err: HTTPError, req: Request, res: Response) {
    if (err.name === 'NoSuchThingError') {
      res.statusCode = 404;
    } else {
      res.statusCode = err.status ? err.status : 500;
    }

    // Report server errors; these are something we have to fix
    // TODO: reports server? slack?
    /*
    if (res.statusCode >= 500 && res.statusCode < 600) {
      this.express.log.error({ err }, 'Unhandled Error');
    }
     */

    // This is required for 401 responses

    if (res.statusCode === 401) {
      res.setHeader('WWW-Authenticate', 'Bearer');
    }

    res.setHeader('Content-Type', 'application/json');
    return res.json({
      status: res.statusCode,
      reason: err.message,
      detail: err.detail ? err.detail : undefined
    });
  }

  // eslint-disable-next-line no-unused-vars
  noRouteMatch = (req: Request, res: Response, next: (err?: Error) => void) => {
    // OPTIONS default handler falls through here; let it
    if (req.method === 'OPTIONS') {
      setImmediate(next);
    } else {
      if (this.config.log404) {
        setImmediate(next, new HTTPError(`No route found for ${req.originalUrl}`, 404));
      } else {
        const store = getAsyncLocalStorageStore();
        if (store) {
          store[MicroServiceStoreSymbols.NO_LOG] = true;
        }
        setImmediate(next, new HTTPError(`No route found for ${req.originalUrl}`, 404));
      }
    }
  };
}
