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