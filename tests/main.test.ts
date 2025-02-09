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

describe('Microservice', () => {
  beforeAll(() => {
    jest.resetModules();
  });
  describe('default empty config', () => {
    let server: Microservice;
    let port: number;
    beforeAll(async () => {
      process.env.FW_MS_PORT = '0';
      const { Microservice } = await import('../src');
      server = new Microservice();
      const addr = await server.start();
      port = addr.port;
    });
    afterAll(async () => {
      if (server) {
        await server.stop();
      }
      jest.resetModules();
    });
    it('should return 404 for every page', async () => {
      const res = await fetch(`http://localhost:${port}/`);
      expect(res.status).toBe(404);
    });
  });
  describe('app key', () => {
    let server: Microservice;
    let port: number;
    beforeAll(async () => {
      process.env.FW_MS_PORT = '0';
      process.env.APP_KEY_TEST = 'test';
      const { Microservice } = await import('../src');
      server = new Microservice();
      const addr = await server.start();
      port = addr.port;
    });
    afterAll(async () => {
      if (server) {
        await server.stop();
      }
      jest.resetModules();
    });
    it('should return 404', async () => {
      const res = await fetch(`http://localhost:${port}/`);
      expect(res.status).toBe(404);
    });
    it('should return 401 if token is wrong', async () => {
      const res = await fetch(`http://localhost:${port}/`, { headers: { Authorization: 'Bearer wrong' } });
      expect(res.status).toBe(401);
    });
  });
  describe('app key prefix', () => {
    let server: Microservice;
    let port: number;
    beforeAll(async () => {
      process.env.FW_MS_PORT = '0';
      process.env.APP_KEY_TEST = 'aaaa_test';
      process.env.FW_MS_PRE_SHARED_TOKEN_PREFIX = 'aaaa_';
      const { Microservice } = await import('../src');
      server = new Microservice();
      const addr = await server.start();
      port = addr.port;
    });
    afterAll(async () => {
      if (server) {
        await server.stop();
      }
      jest.resetModules();
      delete process.env.FW_MS_PRE_SHARED_TOKEN_PREFIX;
      delete process.env.APP_KEY_TEST;
    });
    it('should return 401 if token is wrong', async () => {
      const res = await fetch(`http://localhost:${port}/`, { headers: { Authorization: 'Bearer test' } });
      expect(res.status).toBe(401);
    });
  });
  describe('openapi v3.0', () => {
    let server: Microservice;
    let port: number;
    beforeAll(async () => {
      process.env.FW_MS_PORT = '0';
      process.env.APP_KEY_TEST = 'test';
      const { Microservice } = await import('../src');
      server = new Microservice({
        openApi: {
          specFile: 'tests/fixtures/openapi-3.0/openapi-3.0.yaml',
          validateResponse: true,
          controllersPath: path.join(__dirname, 'fixtures/openapi-3.0')
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
      delete process.env.APP_KEY_TEST;
    });
    it('should return 404', async () => {
      const res = await fetch(`http://localhost:${port}/`);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toHaveProperty('homage');
      expect(data).toHaveProperty('version');
    });
    it('should return 401 if token is not send', async () => {
      const res = await fetch(`http://localhost:${port}/protected`);
      expect(res.status).toBe(401);
    });
    it('should return 200 if token is correct', async () => {
      const res = await fetch(`http://localhost:${port}/protected`, { headers: { Authorization: 'Bearer test' } });
      expect(res.status).toBe(200);
    });
    it('should return 500 if response payload does not match openapi spec', async () => {
      const res = await fetch(`http://localhost:${port}/broken`);
      expect(res.status).toBe(500);
    });
  });
  describe('openapi v3.0 (custom server)', () => {
    let server: Microservice;
    let port: number;
    beforeAll(async () => {
      process.env.FW_MS_PORT = '0';
      process.env.APP_KEY_TEST = 'test';
      const { TestServer } = await import('./fixtures/openapi-3.0/TestServer');
      server = new TestServer();
      const addr = await server.start();
      port = addr.port;
    });
    afterAll(async () => {
      if (server) {
        await server.stop();
      }
      jest.resetModules();
      delete process.env.APP_KEY_TEST;
    });
    it('should return 404', async () => {
      const res = await fetch(`http://localhost:${port}/`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('homage');
      expect(data).toHaveProperty('version');
    });
    it('should return 401 if token is not send', async () => {
      const res = await fetch(`http://localhost:${port}/protected`);
      expect(res.status).toBe(401);
    });
    it('should return 200 if token is correct', async () => {
      const res = await fetch(`http://localhost:${port}/protected`, { headers: { Authorization: 'Bearer test' } });
      expect(res.status).toBe(200);
    });
    it('should return 500 if response payload does not match openapi spec', async () => {
      const res = await fetch(`http://localhost:${port}/broken`);
      expect(res.status).toBe(500);
    });
  });
  describe('openapi v3.1', () => {
    let server: Microservice;
    let port: number;
    beforeAll(async () => {
      const { Microservice } = await import('../src');
      server = new Microservice({
        port: 0,
        appKeys: {
          test: 'test'
        },
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
    });
    it('should return 404', async () => {
      const res = await fetch(`http://localhost:${port}/`);
      const data = await res.json();
      expect(res.status).toBe(200);

      expect(data).toHaveProperty('homage');
      expect(data).toHaveProperty('version');
    });
    it('should return 401 if token is not send', async () => {
      const res = await fetch(`http://localhost:${port}/protected`);
      expect(res.status).toBe(401);
    });
    it('should return 200 if token is correct', async () => {
      const res = await fetch(`http://localhost:${port}/protected`, { headers: { Authorization: 'Bearer test' } });
      expect(res.status).toBe(200);
    });
    it('should return 500 if response payload does not match openapi spec', async () => {
      const res = await fetch(`http://localhost:${port}/broken`);
      expect(res.status).toBe(500);
    });
  });
  describe('openapi v3.1 (custom server)', () => {
    let server: Microservice;
    let port: number;
    beforeAll(async () => {
      process.env.FW_MS_PORT = '0';
      process.env.APP_KEY_TEST = 'test';
      const { TestServer } = await import('./fixtures/openapi-3.1/TestServer');
      server = new TestServer();
      const addr = await server.start();
      port = addr.port;
    });
    afterAll(async () => {
      if (server) {
        await server.stop();
      }
      jest.resetModules();
      delete process.env.APP_KEY_TEST;
    });
    it('should return 404', async () => {
      const res = await fetch(`http://localhost:${port}/`);
      const data = await res.json();
      expect(res.status).toBe(200);

      expect(data).toHaveProperty('homage');
      expect(data).toHaveProperty('version');
    });
    it('should return 401 if token is not send', async () => {
      const res = await fetch(`http://localhost:${port}/protected`);
      expect(res.status).toBe(401);
    });
    it('should return 200 if token is correct', async () => {
      const res = await fetch(`http://localhost:${port}/protected`, { headers: { Authorization: 'Bearer test' } });
      expect(res.status).toBe(200);
    });
    it('should return 500 if response payload does not match openapi spec', async () => {
      const res = await fetch(`http://localhost:${port}/broken`);
      expect(res.status).toBe(500);
    });
  });
});
