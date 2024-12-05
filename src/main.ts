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

import { parseCliArgs } from './cli/cli';
import { FileReader } from './io/reader';
import { FileWriter } from './io/writer';
import { ZodValidator } from './core/validator';
import { MarkdownConverter } from './core/converter';
import { Pipeline } from './core/pipeline';

async function main() {
  const args = await parseCliArgs();
  if (args.version) {
    console.log('openapi2md version 2.0.0');
    return;
  }

  const outputPath = args.output || (args.multiple ? 'docs/' : args.input.replace(/\.\w+$/, '.md'));
  const pipeline = new Pipeline(
    new FileReader(),
    new ZodValidator(),
    new MarkdownConverter(),
    new FileWriter()
  );

  try {
    await pipeline.run({
      inputPath: args.input,
      outputPath: outputPath,
      options: {
        singleFile: args.single,
        multipleFiles: args.multiple,
        headingLevel: args.headings,
        toc: args.toc,
        template: args.template
      }
    });
    console.log('Documentation generated successfully!');
  } catch (err: any) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});