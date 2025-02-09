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

import type { Microservice } from '../src';
import * as path from 'node:path';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { CertificateCreationResult } from 'pem';
import * as os from 'node:os';
import * as jwt from 'jsonwebtoken';
import { createCerts, getPemPublicKey } from './utils/certUtils';

describe('test jwt middleware', () => {
  describe('without app keys', () => {
    let server: Microservice;
    let port: number;
    let keys: CertificateCreationResult;
    let clientCertPath: string;
    beforeAll(async () => {
      keys = await createCerts();
      const tmpPath = await mkdtemp(os.tmpdir() + '/certs-');
      clientCertPath = path.join(tmpPath, 'client-cert.pem');
      const publicKey = await getPemPublicKey(keys.clientKey);
      await writeFile(clientCertPath, publicKey, 'utf8');
      const { Microservice } = await import('../src');
      server = new Microservice({
        jwtPublicKey: clientCertPath,
        port: 0,
        openApi: {
          specFile: 'tests/fixtures/openapi-3.1/openapi-3.1.yaml',
          validateResponse: true,
          controllersPath: path.join(__dirname, 'fixtures/openapi-3.1')
        }
      });
      const addr = await server.start();
      port = addr.port;
    });
    afterAll(async () => {
      if (server) {
        await server.stop();
      }
      jest.resetModules();
      await rm(clientCertPath);
    });

    it('must validate requests with valid jwt', async () => {
      const token = jwt.sign(
        { consumer: { id: 'a', roles: ['admin'], attr: { name: 'test', type: 'user' } } },
        keys.serviceKey,
        { expiresIn: 3600, algorithm: 'RS256' }
      );
      const res = await fetch(`http://localhost:${port}/protected`, { headers: { Authorization: `Bearer ${token}` } });
      await res.json();
      expect(res.status).toBe(200);
    });
  });
  describe('with app keys and prefix', () => {
    let server: Microservice;
    let port: number;
    let keys: CertificateCreationResult;
    let clientCertPath: string;
    beforeAll(async () => {
      keys = await createCerts();
      const tmpPath = await mkdtemp(os.tmpdir() + '/certs-');
      clientCertPath = path.join(tmpPath, 'client-cert.pem');
      const publicKey = await getPemPublicKey(keys.clientKey);
      await writeFile(clientCertPath, publicKey, 'utf8');
      const { Microservice } = await import('../src');
      server = new Microservice({
        jwtPublicKey: clientCertPath,
        port: 0,
        preSharedTokenPrefix: 'test_',
        appKeys: { test_key: 'test' },
        openApi: {
          specFile: 'tests/fixtures/openapi-3.1/openapi-3.1.yaml',
          validateResponse: true,
          controllersPath: path.join(__dirname, 'fixtures/openapi-3.1')
        }
      });
      const addr = await server.start();
      port = addr.port;
    });
    afterAll(async () => {
      if (server) {
        await server.stop();
      }
      jest.resetModules();
      await rm(clientCertPath);
    });

    it('must validate requests with valid jwt', async () => {
      const token = jwt.sign(
        { consumer: { id: 'a', roles: ['admin'], attr: { name: 'test', type: 'user' } } },
        keys.serviceKey,
        { expiresIn: 3600, algorithm: 'RS256' }
      );
      const res = await fetch(`http://localhost:${port}/protected`, { headers: { Authorization: `Bearer ${token}` } });
      await res.json();
      expect(res.status).toBe(200);
    });
    it('must validate requests with valid pre shared token', async () => {
      const res = await fetch(`http://localhost:${port}/protected`, { headers: { Authorization: `Bearer test_key` } });
      await res.json();
      expect(res.status).toBe(200);
    });
  });

  describe('with app keys and without prefix', () => {
    let server: Microservice;
    let port: number;
    let keys: CertificateCreationResult;
    let clientCertPath: string;
    beforeAll(async () => {
      keys = await createCerts();
      const tmpPath = await mkdtemp(os.tmpdir() + '/certs-');
      clientCertPath = path.join(tmpPath, 'client-cert.pem');
      const publicKey = await getPemPublicKey(keys.clientKey);
      await writeFile(clientCertPath, publicKey, 'utf8');
      const { Microservice } = await import('../src');
      server = new Microservice({
        jwtPublicKey: clientCertPath,
        port: 0,
        appKeys: { qwerty: 'test' },
        openApi: {
          specFile: 'tests/fixtures/openapi-3.1/openapi-3.1.yaml',
          validateResponse: true,
          controllersPath: path.join(__dirname, 'fixtures/openapi-3.1')
        }
      });
      const addr = await server.start();
      port = addr.port;
    });
    afterAll(async () => {
      if (server) {
        await server.stop();
      }
      jest.resetModules();
      await rm(clientCertPath);
    });

    it('must validate requests with valid jwt', async () => {
      const token = jwt.sign(
        { consumer: { id: 'a', roles: ['admin'], attr: { name: 'test', type: 'user' } } },
        keys.serviceKey,
        { expiresIn: 3600, algorithm: 'RS256' }
      );
      const res = await fetch(`http://localhost:${port}/protected`, { headers: { Authorization: `Bearer ${token}` } });
      await res.json();
      expect(res.status).toBe(200);
    });
    it('must validate requests with valid pre shared token', async () => {
      const res = await fetch(`http://localhost:${port}/protected`, { headers: { Authorization: `Bearer qwerty` } });
      await res.json();
      expect(res.status).toBe(200);
    });
  });
});
