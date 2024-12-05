import type { Reader } from '../core/interfaces';
import { promises as fs } from 'fs';
import { parse } from 'yaml';

export class FileReader implements Reader {
  async read(inputPath: string): Promise<unknown> {
    const data = await fs.readFile(inputPath, 'utf-8');
    try {
      return parse(data);
    } catch {
      // If YAML parse fails, try JSON
      return JSON.parse(data);
    }
  }
}