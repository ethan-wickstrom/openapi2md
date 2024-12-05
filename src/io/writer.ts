import type { Writer } from '../core/interfaces';
import { promises as fs } from 'fs';
import { dirname } from 'path';

export class FileWriter implements Writer {
  async writeSingle(filePath: string, content: string): Promise<void> {
    await fs.mkdir(dirname(filePath), {recursive:true});
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async writeMultiple(outputDir: string, files: {[name: string]: string}): Promise<void> {
    await fs.mkdir(outputDir, {recursive:true});
    const promises = Object.entries(files).map(([name, content]) =>
      fs.writeFile(outputDir.endsWith('/') ? outputDir + name : outputDir + '/' + name, content, 'utf-8')
    );
    await Promise.all(promises);
  }
}