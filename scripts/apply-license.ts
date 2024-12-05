#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, extname } from 'path';

/**
 * > **Configuration Section**  
 * Here you can adjust which file types are processed, how comments are formatted
 * for those types, and which directories should be ignored.  
 * 
 * *Changing these values should be straightforward and self-documenting.*
 */

const DEFAULT_LICENSE_TEXT = `${new Date().getFullYear()} Ethan Wickstrom

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`;

/**
 * > **Supported Extensions**
 * We define which file types to process here.  
 * Add or remove extensions as needed.
 */
const PROCESSABLE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', 
  '.css', '.scss', '.less'
]);

/**
 * > **Comment Styles**
 * Defines how to format license headers for different file types.  
 * The `start` and `end` define how to wrap license text in comments.
 * If no `end` is provided, each line is prefixed by `start`.
 */
const COMMENT_STYLES: Record<string, { start: string; end?: string }> = {
  '.ts': { start: '//' },
  '.tsx': { start: '//' },
  '.js': { start: '//' },
  '.jsx': { start: '//' },

  '.css': { start: '/*', end: ' */' },
  '.scss': { start: '/*', end: ' */' },
  '.less': { start: '/*', end: ' */' },

  '.graphql': { start: '#' },
  '.gql': { start: '#' },

  '.json': { start: '//' },
  '.yaml': { start: '#' },
  '.yml': { start: '#' }
};

/**
 * > **Ignored Directories**
 * Directories that should not be processed.  
 * `node_modules` and hidden directories are ignored by default.
 */
const IGNORED_DIRECTORIES = new Set<string>([
  'node_modules'
]);

/**
 * > **CLI Argument Parsing**
 * 
 * We allow a few optional arguments:
 * 1. `--root <path>`: Specify a custom root directory to run from (defaults to current working directory).
 * 2. `--dry-run`: If present, the script will not write any changes, only log what it would do.
 * 3. `--license-file <path>`: Provide a custom license file to use instead of the default text.
 * 
 * *Example Usage:*  
 * `bun run apply-license.ts --root ./src --dry-run`
 */

interface CLIOptions {
  rootDir: string;
  dryRun: boolean;
  licenseText: string;
}

function parseCLIArgs(): CLIOptions {
  const args = process.argv.slice(2);
  
  let rootDir = process.cwd();
  let dryRun = false;
  let licenseText = DEFAULT_LICENSE_TEXT;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--root':
        if (args[i+1]) {
          rootDir = args[i+1];
          i++;
        } else {
          console.error(`Error: Missing value for --root argument.`);
          process.exit(1);
        }
        break;
      case '--dry-run':
        dryRun = true;
        break;
      case '--license-file':
        if (args[i+1]) {
          const licensePath = args[i+1];
          if (!existsSync(licensePath)) {
            console.error(`Error: License file not found at ${licensePath}.`);
            process.exit(1);
          }
          licenseText = readFileSync(licensePath, 'utf8');
          i++;
        } else {
          console.error(`Error: Missing value for --license-file argument.`);
          process.exit(1);
        }
        break;
      default:
        // Ignore unknown arguments for now or add future handling
        break;
    }
  }

  return { rootDir, dryRun, licenseText };
}

/**
 * > **Helper Functions**
 * These functions handle the logic for formatting the license, checking file eligibility,
 * and applying headers. They encapsulate small, well-defined tasks, promoting reusability and clarity.
 */

/**  
 * **formatLicenseForFileType**: Wraps the license text with appropriate comment syntax.  
 * If no comment style is found for the file extension, returns the raw license text.
 */
function formatLicenseForFileType(license: string, ext: string): string {
  const style = COMMENT_STYLES[ext];
  if (!style) return license.trim() + '\n\n';

  const lines = license.trim().split('\n');
  // If there's an end style, put it after all lines have been processed.
  if (style.end) {
    const commented = lines.map(line => `${style.start} ${line}`).join('\n');
    return `${commented}${style.end}\n\n`;
  } else {
    return lines.map(line => `${style.start} ${line}`).join('\n') + '\n\n';
  }
}

/**
 * **shouldProcessFile**: Determines if a file should be processed based on its extension,
 * and ensures we skip known ignored directories or node_modules references.
 */
function shouldProcessFile(path: string): boolean {
  const ext = extname(path);
  return PROCESSABLE_EXTENSIONS.has(ext) && !path.includes('node_modules');
}

/**
 * **hasExistingLicense**: Quick heuristic to detect if a file likely has a license header.
 * Adjust this check if you use a different license text or a unique marker.
 */
function hasExistingLicense(content: string): boolean {
  const trimmed = content.trimStart();
  return trimmed.startsWith('// Copyright') || trimmed.startsWith('/*') || trimmed.startsWith('#');
}

/**
 * **processFile**: Reads a file, checks if it needs a license header, and if so, prepends it.
 * If `dryRun` is true, it only logs what would happen without writing changes.
 */
function processFile(filePath: string, licenseText: string, dryRun: boolean): void {
  const content = readFileSync(filePath, 'utf8');
  const ext = extname(filePath);

  if (hasExistingLicense(content)) {
    console.log(`\x1b[33m[SKIP]\x1b[0m ${filePath} - Already contains a license header.`);
    return;
  }

  const formattedLicense = formatLicenseForFileType(licenseText, ext);
  const newContent = formattedLicense + content;

  if (dryRun) {
    console.log(`\x1b[36m[DRY-RUN]\x1b[0m Would add license header to: ${filePath}`);
  } else {
    writeFileSync(filePath, newContent);
    console.log(`\x1b[32m[ADDED]\x1b[0m License header to: ${filePath}`);
  }
}

/**
 * **processDirectory**: Recursively processes a directory, applying headers to matching files.
 * Skips ignored directories and ensures we don't traverse hidden directories.
 */
function processDirectory(dir: string, licenseText: string, dryRun: boolean): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    // Ignore hidden directories and explicitly ignored directories
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || IGNORED_DIRECTORIES.has(entry.name)) continue;
      const subDir = join(dir, entry.name);
      processDirectory(subDir, licenseText, dryRun);
    } else if (entry.isFile()) {
      const fullPath = join(dir, entry.name);
      if (shouldProcessFile(fullPath)) {
        processFile(fullPath, licenseText, dryRun);
      }
    }
  }
}

/**
 * > **Validation**
 * Ensure we’re running from the correct root directory (or user-specified directory)
 * by checking for a `package.json` file, unless user opts to skip this check.
 */
function validateRootDirectory(dir: string): void {
  if (!existsSync(join(dir, 'package.json'))) {
    console.error(`\x1b[31m[ERROR]\x1b[0m package.json not found in directory: ${dir}`);
    console.error('Please run this script from a project root directory or specify --root.');
    process.exit(1);
  }
}

/** 
 * > **main**: The main entry point function.  
 * This orchestrates the entire process:
 * - Parse CLI arguments
 * - Validate the root directory
 * - Recursively process directories
 */
function main(): void {
  const { rootDir, dryRun, licenseText } = parseCLIArgs();

  // Validate root directory
  validateRootDirectory(rootDir);

  console.log(`\n\x1b[1mStarting license header addition...\x1b[0m`);
  console.log(`Root Directory: ${rootDir}`);
  console.log(`Dry Run Mode: ${dryRun ? 'Enabled' : 'Disabled'}`);
  console.log('');

  processDirectory(rootDir, licenseText, dryRun);

  console.log('\n\x1b[1mDone adding license headers!\x1b[0m\n');
}

// Invoke main
main();
