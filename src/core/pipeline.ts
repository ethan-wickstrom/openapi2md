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

import type { Reader, Validator, Converter, Writer, ConverterOptions } from './interfaces';
import { resolveRefs } from './ref-resolver';

interface PipelineArgs {
  inputPath: string;
  outputPath: string;
  options: ConverterOptions;
}

export class Pipeline {
  constructor(
    private reader: Reader,
    private validator: Validator,
    private converter: Converter,
    private writer: Writer
  ) {}

  async run(args: PipelineArgs): Promise<void> {
    const rawDoc = await this.reader.read(args.inputPath);
    const resolvedDoc = await resolveRefs(rawDoc); // Dereference $refs
    const doc = await this.validator.validate(resolvedDoc);
    const result = await this.converter.convert(doc, args.options);

    if (result.single) {
      await this.writer.writeSingle(args.outputPath, result.single.content);
    } else if (result.multiple) {
      await this.writer.writeMultiple(args.outputPath, result.multiple);
    }
  }
}