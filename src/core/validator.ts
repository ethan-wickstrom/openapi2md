// 2024 Ethan Wickstrom
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { Validator } from './interfaces';
import { z } from 'zod';
import type { OpenAPIV3 } from 'openapi-types';

const openapiVersionRegex = /^3\.\d+\.\d+$/;

const DocumentSchema = z.object({
  openapi: z.string().regex(openapiVersionRegex),
  info: z.object({
    title: z.string(),
    version: z.string(),
    description: z.string().optional()
  }),
  paths: z.record(z.string(), z.any())
}).passthrough();

export class ZodValidator implements Validator {
  async validate(doc: unknown): Promise<OpenAPIV3.Document> {
    const result = DocumentSchema.safeParse(doc);
    if(!result.success) {
      throw new Error('Invalid OpenAPI document:\n' + JSON.stringify(result.error.issues, null, 2));
    }
    return result.data as OpenAPIV3.Document;
  }
}