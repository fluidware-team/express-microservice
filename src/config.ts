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

import { EnvParse, getEnvironment, getLogger } from '@fluidware-it/saddlebag';
import { hostname } from 'os';
import * as fs from 'fs';

const environment = getEnvironment();

// APP_KEY_${appName}: pre shared token for appName
EnvParse.envStringOptional('APP_KEY_${appName}');

const preSharedTokenPrefix = EnvParse.envString('FW_MS_PRE_SHARED_TOKEN_PREFIX', '');

export interface LocalApplication {
  [token: string]: string;
}

export interface ApplicationRoles {
  [token: string]: string[];
}

export interface MicroServiceOptions {
  port?: number;
  log404?: boolean;
  hostname?: string;
  address?: string;
  addresses?: string[];
  trustProxy?: string[] | boolean;
  maxUploadSize?: string;
  preSharedTokenPrefix?: string;
  jwtPublicKey?: string;
  appKeys?: LocalApplication;
  appRoles?: ApplicationRoles;
  appDefaultRoles?: string[];
  key?: string;
  cert?: string;
  forwardUnknownBearer?: boolean;
  openApi?: {
    specFile: string;
    validateResponse: boolean;
    controllersPath: string;
  };
}

export interface MicroServiceConfig {
  port: number;
  log404: boolean;
  hostname: string;
  address?: string;
  addresses: string[];
  trustProxy: string[] | boolean;
  maxUploadSize: string;
  preSharedTokenPrefix: string;
  jwtPublicKey?: string;
  appKeys: LocalApplication;
  appRoles: ApplicationRoles;
  appDefaultRoles: string[];
  key?: string;
  cert?: string;
  forwardUnknownBearer?: boolean;
  openApi?: {
    specFile: string;
    validateResponse: boolean;
    controllersPath: string;
  };
}

function getOpenApiConfig() {
  const specFile = EnvParse.envStringOptional('FW_MS_OPENAPI_SPEC_FILE');
  const validateResponse = EnvParse.envBool('FW_MS_OPENAPI_VALIDATE_RESPONSE', true);
  const controllersPath = EnvParse.envStringOptional('FW_MS_OPENAPI_CONTROLLERS_PATH');
  if (specFile && controllersPath) {
    return {
      specFile,
      validateResponse,
      controllersPath
    };
  }
  if (specFile || controllersPath) {
    getLogger().warn('OpenApi configuration is incomplete');
  }
  return undefined;
}

let _appRoles: Record<string, string[]> = {};

function readFileContent(filePath: string | undefined): string | undefined {
  if (!filePath) {
    return undefined;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function getTrustProxy(): string[] | boolean {
  const trustProxy = EnvParse.envString('FW_MS_TRUST_PROXY', 'loopback,linklocal,uniquelocal');
  if (trustProxy === 'true') {
    return true;
  }
  if (trustProxy === 'false') {
    return false;
  }
  return trustProxy
    .split(',')
    .map(s => s.trim())
    .filter(x => x !== '');
}

export const Config: MicroServiceConfig = {
  port: EnvParse.envInt('FW_MS_PORT', 8080),
  log404: EnvParse.envBool('FW_MS_LOG_404', false),
  // FW_MS_HOSTNAME: default to hostname()
  hostname: EnvParse.envString('FW_MS_HOSTNAME', hostname()),
  address: EnvParse.envStringOptional('FW_MS_ADDRESS'),
  addresses: EnvParse.envStringList('FW_MS_ADDRESSES', []),
  trustProxy: getTrustProxy(),
  maxUploadSize: EnvParse.envString('FW_MS_MAX_UPLOAD_SIZE', '128kb'),
  preSharedTokenPrefix: preSharedTokenPrefix || '',
  jwtPublicKey: EnvParse.envStringOptional('FW_MS_JWT_PUBLIC_KEY'),
  // FW_MS_KEY: full key for https (wins over FW_MS_KEY_FILE)
  // FW_MS_KEY_FILE: path to file containing full key for https
  key: EnvParse.envStringOptional('FW_MS_KEY') || readFileContent(EnvParse.envStringOptional('FW_MS_KEY_FILE')),
  // FW_MS_CERT: full cert for https (wins over FW_MS_CERT_FILE)
  // FW_MS_CERT_FILE: path to file containing full cert for https
  cert: EnvParse.envStringOptional('FW_MS_CERT') || readFileContent(EnvParse.envStringOptional('FW_MS_CERT_FILE')),
  appDefaultRoles: EnvParse.envStringList('FW_APP_DEFAULT_ROLES', ['admin']),
  appKeys: Object.keys(environment).reduce((ret: { [key: string]: string }, name) => {
    const value = environment[name];
    function checkTokenPrefix(appName: string, token: string) {
      if (preSharedTokenPrefix) {
        if (!token.startsWith(preSharedTokenPrefix)) {
          getLogger().warn(`Invalid token for ${appName}: it does not start with prefix ${preSharedTokenPrefix}`);
        } else {
          ret[token] = appName.toLowerCase();
        }
      } else {
        ret[token] = appName.toLowerCase();
      }
    }
    if (value) {
      const match = name.match(/^APP_KEY_(.*)$/);
      if (match) {
        const [, appName] = Array.from(match);
        const isFile = appName.match(/^(.*)_FILE$/);
        if (isFile) {
          const [, _appName] = Array.from(isFile);
          fs.readFileSync(value, 'utf8')
            .split('\n')
            .map(l => l.trim())
            .filter(l => !!l)
            .forEach(token => {
              checkTokenPrefix(_appName, token);
            });
        } else {
          checkTokenPrefix(appName, value);
        }
        // APP_${appName}_ROLES: roles to assign to appName
        const appRoles = EnvParse.envStringList<string>(`APP_${appName}_ROLES`, []);
        if (appRoles.length > 0) {
          _appRoles[appName.toLowerCase()] = appRoles;
        }
      }
    }
    return ret;
  }, {}),
  appRoles: _appRoles,
  // FW_MS_FORWARD_UNKNOWN_BEARER: forward unknown bearer token to the next middleware
  forwardUnknownBearer: EnvParse.envBool('FW_MS_FORWARD_UNKNOWN_BEARER', false),
  openApi: getOpenApiConfig()
};
