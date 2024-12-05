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