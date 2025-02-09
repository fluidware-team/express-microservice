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

import type { Request, Response } from 'express';

const homage = {
  homage:
    '"Through the fathomless deeps of space swims the star turtle Great A\'Tuin, bearing on its back the four giant elephants who carry on their shoulders the mass of the Discworld." -- Sir Terry Pratchett',
  version: '1.0.0'
};

export function getHome(req: Request, res: Response) {
  res.json(homage);
}

export function getProtected(req: Request, res: Response) {
  res.json(homage);
}

export function getBroken(req: Request, res: Response) {
  res.json({
    homage: homage.homage
  });
}
