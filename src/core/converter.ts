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

import type { Converter, ConverterOptions, ConvertedOutput, TemplateData } from './interfaces';
import { promises as fs } from 'fs';
import Handlebars from 'handlebars';
import type { OpenAPIV3 } from 'openapi-types';
import { buildTemplateData } from './utils';
import { registerHelpers } from '../templates/helpers';

export class MarkdownConverter implements Converter {
  private defaultTemplate: string = '';

  constructor() {}

  async convert(doc: OpenAPIV3.Document, opts: ConverterOptions): Promise<ConvertedOutput> {
    // Load default template if needed
    if (!opts.template) {
      this.defaultTemplate = await fs.readFile(new URL('../templates/default-template.hbs', import.meta.url), 'utf-8');
    }
    const templateContent = opts.template ? await fs.readFile(opts.template, 'utf-8') : this.defaultTemplate;

    const template = Handlebars.compile(templateContent);
    registerHelpers(Handlebars);

    const data: TemplateData = buildTemplateData(doc, opts);

    if (opts.multipleFiles) {
      const output: {[filename: string]: string} = {};
      for (const p of data.paths) {
        const singleData: TemplateData = {
          title: data.title,
          description: data.description,
          version: data.version,
          paths: [p],
          toc: false,
          headingLevel: opts.headingLevel
        };
        const md = template(singleData);
        const fileName = p.path.replace(/[^\w\-]+/g,'_').replace(/^_+|_+$/g,'') || 'root';
        output[fileName+'.md'] = md;
      }
      return { multiple: output };
    } else {
      const md = template(data);
      const fileName = 'api.md';
      return { single: {fileName, content: md} };
    }
  }
}