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

const preSharedTokenPrefix = EnvParse.envString('FW_MS_PRE_SHARED_TOKEN_PREFIX', '');

export interface LocalApplication {
  [token: string]: string;
}

export interface MicroServiceConfig {
  port: number;
  log404: boolean;
  hostname: string;
  address?: string;
  addresses: string[];
  trustProxy: string[];
  maxUploadSize: string;
  preSharedTokenPrefix: string;
  jwtPublicKey?: string;
  appKeys: LocalApplication;
  key?: string;
  cert?: string;
}

export const Config: MicroServiceConfig = {
  port: EnvParse.envInt('FW_MS_PORT', 8080),
  log404: EnvParse.envBool('FW_MS_LOG_404', false),
  // FW_MS_HOSTNAME: default to hostname()
  hostname: EnvParse.envString('FW_MS_HOSTNAME', hostname()),
  address: EnvParse.envStringOptional('FW_MS_ADDRESS'),
  addresses: EnvParse.envStringList('FW_MS_ADDRESSES', []),
  trustProxy: EnvParse.envStringList('FW_MS_TRUST_PROXY', ['loopback', 'linklocal', 'uniquelocal']),
  maxUploadSize: EnvParse.envString('FW_MS_MAX_UPLOAD_SIZE', '128kb'),
  preSharedTokenPrefix: preSharedTokenPrefix || '',
  jwtPublicKey: EnvParse.envStringOptional('FW_MS_JWT_PUBLIC_KEY'),
  key: EnvParse.envStringOptional('FW_MS_KEY'),
  cert: EnvParse.envStringOptional('FW_MS_CERT'),
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
      }
    }
    return ret;
  }, {})
};
