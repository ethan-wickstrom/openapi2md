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