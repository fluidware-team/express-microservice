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

describe('config via ENV', () => {
  let processEnv: NodeJS.ProcessEnv;
  beforeAll(() => {
    processEnv = process.env;
  });
  afterEach(() => {
    process.env = processEnv;
    jest.resetModules();
  });
  it('should set appKeys from env', async () => {
    process.env.APP_KEY_TEST = 'qwerty';
    const config = await import('../src/config');
    expect(config.Config.appKeys).toHaveProperty('qwerty', 'test');
  });
  it('should set appKeys from env (with roles)', async () => {
    process.env.APP_KEY_TEST = 'qwerty';
    process.env.APP_TEST_ROLES = 'role0';
    process.env.APP_KEY_TEST2 = 'poiuy';
    process.env.APP_TEST2_ROLES = 'role1,role2';
    const config = await import('../src/config');
    expect(config.Config.appKeys).toHaveProperty('qwerty', 'test');
    expect(config.Config.appRoles).toHaveProperty('test', ['role0']);
    expect(config.Config.appKeys).toHaveProperty('poiuy', 'test2');
    expect(config.Config.appRoles).toHaveProperty('test2', ['role1', 'role2']);
  });
  it('should set appKeys from env (file)', async () => {
    process.env.APP_KEY_TEST_FILE = './tests/fixtures/test.secret';
    const config = await import('../src/config');
    expect(config.Config.appKeys).toHaveProperty('poiuy', 'test');
  });
  it('should ignore appKey that does not match prefix', async () => {
    process.env.FW_MS_PRE_SHARED_TOKEN_PREFIX = 'secret_';
    process.env.APP_KEY_TEST = 'qwerty';
    process.env.APP_KEY_TEST2 = 'secret_qwerty';
    const config = await import('../src/config');
    expect(config.Config.appKeys).not.toHaveProperty('qwerty');
    expect(config.Config.appKeys).toHaveProperty('secret_qwerty');
  });
  it('should ignore incomplete openapi configuration', async () => {
    process.env.FW_MS_OPENAPI_SPEC_FILE = './tests/fixtures/openapi.yaml';
    const config = await import('../src/config');
    expect(config.Config.openApi).toBeUndefined();
  });
  it('should set openapi configuration', async () => {
    process.env.FW_MS_OPENAPI_SPEC_FILE = './tests/fixtures/openapi.yaml';
    process.env.FW_MS_OPENAPI_CONTROLLERS_PATH = './tests/fixtures/controllers';
    const config = await import('../src/config');
    expect(config.Config.openApi).toStrictEqual({
      specFile: './tests/fixtures/openapi.yaml',
      controllersPath: './tests/fixtures/controllers',
      validateResponse: true
    });
  });
});
