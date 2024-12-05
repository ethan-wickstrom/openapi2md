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

import type { Storage } from '../io/storage';
import { ProjectRefUpdater } from '../project-ref-updater';

export type SemanticVersion = `${number}.${number}.${number}`;

interface VersionEntry {
  version: SemanticVersion;
  timestamp: string;
  notes?: string;
}

interface VersionLog {
  history: VersionEntry[];
}

export class VersionManager {
  constructor(
    private storage: Storage,
    private packageJsonPath: string,
    private versionLogPath: string,
    private projectRoot: string
  ) {}

  public async getCurrentVersion(): Promise<SemanticVersion> {
    const pkgDataStr = await this.storage.readFile(this.packageJsonPath);
    const pkgData = JSON.parse(pkgDataStr);
    const versionStr: string = pkgData.version;
    return this.ensureSemanticVersion(versionStr);
  }

  /**
   * Ensures that the current version in package.json is valid and consistent with the version log.
   * - If no history exists, initializes the log with the current version.
   * - If current version < last known version, throws an error (regression).
   * - If current version > last known version, adds the current version to the log.
   * - If current version == last known version, does nothing.
   */
  public async ensureCurrentVersionValid(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    let log = await this.readLog();
    log = await this.validateAndRepairLog(log);

    const latest = log.history[log.history.length - 1]?.version;

    if (!latest) {
      // No history yet, initialize with current version
      const entry: VersionEntry = {
        version: currentVersion,
        timestamp: new Date().toISOString(),
        notes: 'Initial recorded version'
      };
      log.history.push(entry);
      await this.storage.writeFile(this.versionLogPath, JSON.stringify(log, null, 2));
      return;
    }

    if (!this.isVersionGreaterOrEqual(currentVersion, latest)) {
      if (this.compareVersions(currentVersion, latest) < 0) {
        // Regression
        throw new Error(
          `Version regression detected. Current version (${currentVersion}) is less than last known version (${latest}).`
        );
      }
    } else if (this.compareVersions(currentVersion, latest) > 0) {
      // Current is greater than latest, record it
      const entry: VersionEntry = {
        version: currentVersion,
        timestamp: new Date().toISOString(),
        notes: 'Detected a new version set in package.json outside of a "bump" command'
      };
      log.history.push(entry);
      await this.storage.writeFile(this.versionLogPath, JSON.stringify(log, null, 2));
    }
    // If currentVersion == latest, do nothing
  }

  public async addCurrentVersion(notes?: string): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    let log = await this.readLog();
    log = await this.validateAndRepairLog(log);

    const latest = log.history[log.history.length - 1]?.version;
    if (latest && !this.isVersionGreaterOrEqual(currentVersion, latest)) {
      throw new Error(
        `Version regression detected. Current version (${currentVersion}) is not greater or equal to the last known version (${latest}).`
      );
    }

    if (latest === currentVersion) {
      throw new Error(`Version ${currentVersion} already logged. No change detected.`);
    }

    const entry: VersionEntry = {
      version: currentVersion,
      timestamp: new Date().toISOString(),
      notes
    };
    log.history.push(entry);
    await this.storage.writeFile(this.versionLogPath, JSON.stringify(log, null, 2));
  }

  public async listHistory(): Promise<VersionEntry[]> {
    const log = await this.readLog();
    const validatedLog = await this.validateAndRepairLog(log);
    return validatedLog.history;
  }

  public async validateHistory(): Promise<void> {
    let log: VersionLog = await this.readLog();
    await this.validateAndRepairLog(log);
  }

  public async recommendNextVersion(level: 'patch' | 'minor' | 'major'): Promise<SemanticVersion> {
    const log = await this.validateAndRepairLog(await this.readLog());
    const latest = log.history[log.history.length - 1]?.version || '0.0.0';
    const [ma, mi, pa] = latest.split('.').map(Number);

    let newVersion: SemanticVersion;
    switch (level) {
      case 'patch':
        newVersion = `${ma}.${mi}.${pa + 1}` as SemanticVersion;
        break;
      case 'minor':
        newVersion = `${ma}.${mi + 1}.0` as SemanticVersion;
        break;
      case 'major':
        newVersion = `${ma + 1}.0.0` as SemanticVersion;
        break;
    }
    return newVersion;
  }

  public compareVersions(v1: SemanticVersion, v2: SemanticVersion): number {
    const [ma1, mi1, pa1] = v1.split('.').map(Number);
    const [ma2, mi2, pa2] = v2.split('.').map(Number);

    if (ma1 !== ma2) return ma1 > ma2 ? 1 : -1;
    if (mi1 !== mi2) return mi1 > mi2 ? 1 : -1;
    if (pa1 !== pa2) return pa1 > pa2 ? 1 : -1;
    return 0;
  }

  /**
   * Increments the version, updates references, and logs the new version.
   */
  public async incrementVersion(level: 'patch'|'minor'|'major', notes?: string): Promise<void> {
    const newVersion = await this.recommendNextVersion(level);
    // Update references in project files
    const updater = new ProjectRefUpdater(this.projectRoot);
    const updates = await updater.detectAndUpdateVersion(newVersion);
    if (updates.length === 0) {
      throw new Error(`No version references updated. Ensure project files contain a valid version to update.`);
    }

    // Now that package.json is updated, we add to log
    await this.addCurrentVersion(notes);
  }

  // ---- Internal Helpers ----

  private async readLog(): Promise<VersionLog> {
    const logExists = await this.storage.fileExists(this.versionLogPath);
    if (!logExists) {
      return { history: [] };
    }

    const logData = await this.storage.readFile(this.versionLogPath);
    let log: VersionLog;
    try {
      log = JSON.parse(logData);
    } catch {
      throw new Error(`Invalid JSON in version log at ${this.versionLogPath}`);
    }

    if (!Array.isArray(log.history)) {
      throw new Error(`Invalid version log structure: "history" must be an array.`);
    }

    return log;
  }

  private ensureSemanticVersion(version: string): SemanticVersion {
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)$/;
    const match = version.match(semverRegex);
    if (!match) {
      throw new Error(`Invalid semantic version: "${version}". Must be x.y.z with numeric values.`);
    }

    const major = Number(match[1]);
    const minor = Number(match[2]);
    const patch = Number(match[3]);

    return `${major}.${minor}.${patch}`;
  }

  private async validateAndRepairLog(log: VersionLog): Promise<VersionLog> {
    let last: SemanticVersion | null = null;
    for (let i = 0; i < log.history.length; i++) {
      const entry = log.history[i];
      const validatedVersion = this.ensureSemanticVersion(entry.version);
      log.history[i].version = validatedVersion;

      if (last && !this.isVersionGreaterOrEqual(validatedVersion, last)) {
        throw new Error(
          `Historical regression detected at position ${i} in the history. Version ${validatedVersion} is not >= ${last}.`
        );
      }
      last = validatedVersion;
    }
    return log;
  }

  private isVersionGreaterOrEqual(v1: SemanticVersion, v2: SemanticVersion): boolean {
    return this.compareVersions(v1, v2) >= 0;
  }
}
