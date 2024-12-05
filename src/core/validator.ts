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