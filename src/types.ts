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

/**
 * Any JSON-serializable value.
 *
 * @public
 */
export type Value = string | number | boolean | null | { [key: string]: Value } | Value[];

export const CONSUMER_TYPE = {
  USER: 'user',
  APP: 'app', // @deprecated use SERVICE instead
  SERVICE: 'service',
  UNKNOWN: 'unknown'
} as const;

export interface ConsumerAttributes extends Record<string, Value> {
  name: string;
  type: (typeof CONSUMER_TYPE)[keyof typeof CONSUMER_TYPE];
}

/**
 * A Consumer (often a user, but potentially another actor like a service account) to authorize.
 *
 * @public
 */
export interface Consumer {
  /**
   * A unique identifier for the consumer.
   */
  id: string;

  /**
   * The roles held by the consumer.
   */
  roles: string[];

  /**
   * Application-specific attributes describing the consumer.
   *
   * @defaultValue `{}`
   */
  attr: ConsumerAttributes;
}
