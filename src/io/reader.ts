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