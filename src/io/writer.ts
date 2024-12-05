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