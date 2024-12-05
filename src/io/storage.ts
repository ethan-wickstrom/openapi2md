import { promises as fs } from 'fs';

export interface Storage {
  readFile(path: string): Promise<string>;
  writeFile(path: string, data: string): Promise<void>;
  fileExists(path: string): Promise<boolean>;
}

export class FileSystemStorage implements Storage {
  async readFile(path: string): Promise<string> {
    return fs.readFile(path, 'utf-8');
  }

  async writeFile(path: string, data: string): Promise<void> {
    await fs.writeFile(path, data, 'utf-8');
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      await fs.stat(path);
      return true;
    } catch {
      return false;
    }
  }
}