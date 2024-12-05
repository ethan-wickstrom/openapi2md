import { promises as fs } from 'fs';
import { join } from 'path';
import type { SemanticVersion } from './core/version-manager';

interface FileUpdate {
  filePath: string;
  oldVersion: string;
  newVersion: string;
}

/**
 * ProjectRefUpdater scans known files for the project's version and updates them.
 * In this example:
 * - Always updates package.json
 * - Optionally updates README.md if it contains a version line.
 * You can extend this logic easily.
 */
export class ProjectRefUpdater {
  constructor(private projectRoot: string) {}

  async detectAndUpdateVersion(newVersion: SemanticVersion): Promise<FileUpdate[]> {
    // You can add more files or patterns here
    const filesToUpdate = [
      'package.json',
      'README.md'
    ];

    const updates: FileUpdate[] = [];

    for (const file of filesToUpdate) {
      const filePath = join(this.projectRoot, file);
      let fileData: string;
      try {
        fileData = await fs.readFile(filePath, 'utf-8');
      } catch {
        // If the file doesn't exist, skip
        continue;
      }

      // Attempt to detect old version in the file
      // For package.json, we parse JSON.
      if (file === 'package.json') {
        const json = JSON.parse(fileData);
        const oldVersion = json.version;
        if (oldVersion && oldVersion !== newVersion) {
          json.version = newVersion;
          await fs.writeFile(filePath, JSON.stringify(json, null, 2), 'utf-8');
          updates.push({filePath, oldVersion, newVersion});
        }
      } else {
        // For other files, a naive approach:
        // If we find a line with the old version, we replace it.
        // In a real scenario, you'd have a known pattern.
        const versionRegex = /(\d+\.\d+\.\d+)/g;
        const matches = fileData.match(versionRegex);
        if (matches && matches.length > 0) {
          // Heuristics: assume first match is the version
          const oldVersion = matches[0];
          if (oldVersion !== newVersion) {
            const updatedData = fileData.replace(oldVersion, newVersion);
            await fs.writeFile(filePath, updatedData, 'utf-8');
            updates.push({filePath, oldVersion, newVersion});
          }
        }
      }
    }

    return updates;
  }
}
