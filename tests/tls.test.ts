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

import { createCerts } from './utils/certUtils';
import { Microservice } from '../src';
import { CertificateCreationResult } from 'pem';
import { fetch, Agent } from 'undici';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('should start accepting TLS connections', () => {
  let processEnv: NodeJS.ProcessEnv;
  let server: Microservice;
  let port = 0;

  beforeAll(async () => {
    jest.resetModules();
    processEnv = process.env;
  });
  afterEach(async () => {
    await server.stop();
    process.env = processEnv;
    jest.resetModules();
  });
  describe('via config', () => {
    let cert: CertificateCreationResult;
    beforeAll(async () => {
      cert = await createCerts();
      const { Microservice } = await import('../src');
      server = new Microservice({
        key: cert.clientKey,
        cert: cert.certificate,
        port: 0
      });
      const addr = await server.start();
      port = addr.port;
    });

    it('should accept TLS connection', async () => {
      const res = await fetch(`https://localhost:${port}`, {
        dispatcher: new Agent({
          connect: {
            ca: cert.certificate
          }
        })
      });
      expect(res.status).toBe(404);
    });
  });
  describe('via ENV', () => {
    let cert: CertificateCreationResult;
    let certDir: string;
    beforeAll(async () => {
      cert = await createCerts();
      certDir = await mkdtemp(join(tmpdir(), 'certs-'));
      await writeFile(join(certDir, 'cert.pem'), cert.certificate, 'utf8');
      await writeFile(join(certDir, 'key.pem'), cert.clientKey, 'utf8');
      process.env.FW_MS_KEY_FILE = join(certDir, 'key.pem');
      process.env.FW_MS_CERT_FILE = join(certDir, 'cert.pem');
      const { Microservice } = await import('../src');
      server = new Microservice({
        port: 0,
        trustProxy: false
      });
      const addr = await server.start();
      port = addr.port;
    });

    afterAll(async () => {
      await rm(certDir, { recursive: true });
    });

    it('should accept TLS connection', async () => {
      const res = await fetch(`https://localhost:${port}`, {
        dispatcher: new Agent({
          connect: {
            ca: cert.certificate
          }
        })
      });
      expect(res.status).toBe(404);
    });
  });
});
