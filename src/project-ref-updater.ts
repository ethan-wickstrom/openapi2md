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
import { join } from 'path';
import type { SemanticVersion } from './core/version-manager';
import semver from 'semver';

interface FileUpdate {
  filePath: string;
  oldVersion: string;
  newVersion: SemanticVersion;
}

interface UpdateStrategy {
  detectVersion(content: string): string | null;
  replaceVersion(content: string, newVersion: string): SemanticVersion;
}

class PackageJsonUpdateStrategy implements UpdateStrategy {
  detectVersion(content: string): string | null {
    const json = JSON.parse(content);
    return json.version || null;
  }

  replaceVersion(content: string, newVersion: string): SemanticVersion {
    const json = JSON.parse(content);
    json.version = newVersion;
    return json.version as SemanticVersion;
  }
}

class ReadmeUpdateStrategy implements UpdateStrategy {
  private versionPattern = /(?:version\s*[:=]\s*|v)(\d+\.\d+\.\d+)/i;

  detectVersion(content: string): string | null {
    const match = content.match(this.versionPattern);
    return match ? match[1] : null;
  }

  replaceVersion(content: string, newVersion: string): SemanticVersion {
    const updatedContent = content.replace(this.versionPattern, `$1${newVersion}`);
    return updatedContent as SemanticVersion;
  }
}

/**
 * ProjectRefUpdater scans known files for the project's version and updates them.
 * In this example:
 * - Always updates package.json
 * - Optionally updates README.md if it contains a version line.
 * You can extend this logic easily.
 */
export class ProjectRefUpdater {
  private strategies: Record<string, UpdateStrategy> = {
    'package.json': new PackageJsonUpdateStrategy(),
    'README.md': new ReadmeUpdateStrategy(),
    // Add more file-specific strategies here
  };

  constructor(private projectRoot: string) {}

  async detectAndUpdateVersion(newVersion: SemanticVersion): Promise<FileUpdate[]> {
    if (!semver.valid(newVersion)) {
      throw new Error(`Invalid semantic version: ${newVersion}`);
    }

    const filesToUpdate = Object.keys(this.strategies);
    const updatePromises = filesToUpdate.map(async (file) => {
      const filePath = join(this.projectRoot, file);
      let fileData: string;

      try {
        fileData = await fs.readFile(filePath, 'utf-8');
      } catch (error) {
        console.warn(`File not found: ${filePath}. Skipping.`);
        return null;
      }

      const strategy = this.strategies[file];
      const oldVersion = strategy.detectVersion(fileData);

      if (oldVersion && semver.valid(oldVersion) && semver.lt(oldVersion, newVersion)) {
        const updatedData = strategy.replaceVersion(fileData, newVersion);
        await fs.writeFile(filePath, updatedData, 'utf-8');
        console.log(`Updated ${file} from version ${oldVersion} to ${newVersion}`);
        return { filePath, oldVersion, newVersion };
      }

      return null;
    });

    const updates = await Promise.all(updatePromises);
    return updates.filter((update): update is FileUpdate => update !== null) as FileUpdate[];
  }
}
