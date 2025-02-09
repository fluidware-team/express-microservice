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

import { CertificateCreationResult, createCertificate, getPublicKey } from 'pem';

export async function createCerts(): Promise<CertificateCreationResult> {
  return new Promise((resolve, reject) => {
    createCertificate({ days: 1, selfSigned: true }, (err, keys) => {
      if (err) {
        reject(err);
      }
      resolve(keys);
    });
  });
}

export async function getPemPublicKey(key: string): Promise<string> {
  return new Promise((resolve, reject) => {
    getPublicKey(key, (err, key) => {
      if (err) {
        reject(err);
      }
      resolve(key.publicKey);
    });
  });
}
