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

import type { OpenAPIV3 } from 'openapi-types';

export interface Reader {
  read(inputPath: string): Promise<unknown>;
}

export interface Validator {
  validate(doc: unknown): Promise<OpenAPIV3.Document>;
}

export interface ConverterOptions {
  singleFile: boolean;
  multipleFiles: boolean;
  headingLevel: number;
  toc: boolean;
  template?: string; // Path to a Handlebars template file
}

export interface Converter {
  convert(doc: OpenAPIV3.Document, opts: ConverterOptions): Promise<ConvertedOutput>;
}

export interface ConvertedOutput {
  single?: { fileName: string; content: string };
  multiple?: { [fileName: string]: string };
}

export interface Writer {
  writeSingle(filePath: string, content: string): Promise<void>;
  writeMultiple(outputDir: string, files: { [name: string]: string }): Promise<void>;
}

export interface TemplateData {
  title: string;
  description?: string;
  version: string;
  paths: {
    path: string;
    anchor: string;
    methods: {
      method: string;
      summary?: string;
      description?: string;
      parameters?: ParameterData[];
      requestBody?: BodyData;
      responses: ResponseData[];
    }[]
  }[];
  toc?: boolean;
  headingLevel: number;
}

export interface ParameterData {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schemaType?: string;
}

export interface BodyData {
  description?: string;
  contentType?: string;
  example?: unknown;
  schemaType?: string;
}

export interface ResponseData {
  statusCode: string;
  description: string;
  contentType?: string;
  example?: unknown;
  schemaType?: string;
}