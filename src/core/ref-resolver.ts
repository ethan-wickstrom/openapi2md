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

// Uses json-schema-ref-parser to fully dereference the OpenAPI spec.

import { dereference } from '@apidevtools/json-schema-ref-parser';

export async function resolveRefs(doc: unknown): Promise<unknown> {
  // We can bundle to resolve all $refs into a single document
  // "bundle" will resolve but keep internal $refs. "dereference" would remove all,
  // but in OpenAPI, dereference is often safe.
  // We'll use dereference to ensure no $refs remain at all.
  const dereferenced = await dereference(doc);
  return dereferenced;
}