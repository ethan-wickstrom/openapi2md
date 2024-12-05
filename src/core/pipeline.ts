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