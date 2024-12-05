#!/usr/bin/env bun

/**
 * Apply License Headers Script
 *
 * This script adds license headers to various source files, now with advanced heuristics, configuration,
 * and adaptability. It attempts to be extremely robust, handling edge cases gracefully.
 *
 * Features:
 * - Configurable via CLI and config files
 * - Integrates with `.gitignore` and `.licenseignore`
 * - Advanced heuristics for detecting existing licenses, binary files, generated code, etc.
 * - Detailed logging, dry-run, and interactive modes
 * - Fallback strategies if certain conditions (like no package.json) are met
 */

import {
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
  readdirSync,
} from "fs";
import { join, extname, dirname } from "path";

// -------------------------------------
// Default Constants & Fallbacks
// -------------------------------------
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

// Default configuration
const DEFAULT_CONFIG = {
  processableExtensions: [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".css",
    ".scss",
    ".less",
  ],
  commentStyles: {
    ".ts": { start: "//" },
    ".tsx": { start: "//" },
    ".js": { start: "//" },
    ".jsx": { start: "//" },
    ".css": { start: "/*", end: " */" },
    ".scss": { start: "/*", end: " */" },
    ".less": { start: "/*", end: " */" },
  },
  ignoredDirectories: ["node_modules", "dist", "build", "out"],
  maxFileSizeBytes: 5_000_000, // skip files larger than ~5MB by default
  binaryFileThreshold: 0.1, // if >10% of chars are non-ASCII, treat file as binary
};

// -------------------------------------
// Types & Interfaces
// -------------------------------------
interface CommentStyle {
  start: string;
  end?: string;
}

interface Config {
  processableExtensions: string[];
  commentStyles: Record<string, CommentStyle>;
  ignoredDirectories: string[];
  maxFileSizeBytes: number;
  binaryFileThreshold: number;
  // Potential future fields
  // licenseHeaderPattern?: RegExp;
}

interface CLIOptions {
  rootDir: string;
  dryRun: boolean;
  licenseText: string;
  skipPackageJsonCheck: boolean;
  interactive: boolean;
  verbose: boolean;
  configPath?: string;
}

interface IgnoreRules {
  gitignorePatterns: string[];
  licenseignorePatterns: string[];
}

// -------------------------------------
// Utility Functions
// -------------------------------------

function logInfo(msg: string) {
  console.log(`\x1b[34m[INFO]\x1b[0m ${msg}`);
}

function logWarn(msg: string) {
  console.warn(`\x1b[33m[WARN]\x1b[0m ${msg}`);
}

function logError(msg: string) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
}

function logDebug(msg: string, verbose: boolean) {
  if (verbose) console.log(`\x1b[35m[DEBUG]\x1b[0m ${msg}`);
}

function printHelp(): void {
  console.log(`
\x1b[1mApply License Headers Script\x1b[0m

Usage:
bun run apply-license.ts [OPTIONS]

Options:
--root <path>           Specify the root directory to process. Defaults to current working directory.
--dry-run               Perform a dry run, only logging what would happen without making changes.
--license-file <path>   Use a custom license file instead of the default license text.
--skip-package-check     Skip checking for a package.json in the root directory.
--interactive            Prompt before processing large batches of files.
--verbose                Show debug-level logs.
--config <path>          Use a JSON config file to override defaults (comment styles, ignored dirs, etc.)
--help                   Print this help message.

Examples:
bun run apply-license.ts --root ./src
bun run apply-license.ts --dry-run
bun run apply-license.ts --license-file ./LICENSE.txt
bun run apply-license.ts --skip-package-check
bun run apply-license.ts --config ./license-config.json
`);
}

function parseCLIArgs(): CLIOptions {
  const args = process.argv.slice(2);
  let rootDir = process.cwd();
  let dryRun = false;
  let licenseText = DEFAULT_LICENSE_TEXT;
  let skipPackageJsonCheck = false;
  let interactive = false;
  let verbose = false;
  let configPath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--root":
        if (args[i + 1]) {
          rootDir = args[i + 1];
          i++;
        } else {
          logError(`Missing value for --root argument.`);
          process.exit(1);
        }
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--license-file":
        if (args[i + 1]) {
          const licensePath = args[i + 1];
          if (!existsSync(licensePath)) {
            logError(`License file not found at ${licensePath}.`);
            process.exit(1);
          }
          const fileData = readFileSync(licensePath, "utf8").trim();
          if (!fileData) {
            logError(`The specified license file at ${licensePath} is empty.`);
            process.exit(1);
          }
          licenseText = fileData;
          i++;
        } else {
          logError(`Missing value for --license-file argument.`);
          process.exit(1);
        }
        break;
      case "--skip-package-check":
        skipPackageJsonCheck = true;
        break;
      case "--interactive":
        interactive = true;
        break;
      case "--verbose":
        verbose = true;
        break;
      case "--config":
        if (args[i + 1]) {
          configPath = args[i + 1];
          i++;
        } else {
          logError(`Missing value for --config argument.`);
          process.exit(1);
        }
        break;
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith("--")) {
          logWarn(`Unknown option: ${arg}`);
          console.log(`Use --help to see available options.`);
          process.exit(1);
        }
        break;
    }
  }

  return {
    rootDir,
    dryRun,
    licenseText,
    skipPackageJsonCheck,
    interactive,
    verbose,
    configPath,
  };
}

function loadConfig(filePath: string, verbose: boolean): Partial<Config> {
  if (!filePath || !existsSync(filePath)) {
    logDebug(`No config file found at ${filePath}, using defaults.`, verbose);
    return {};
  }
  try {
    const data = readFileSync(filePath, "utf8");
    const json = JSON.parse(data);
    logDebug(`Loaded config from ${filePath}`, verbose);
    return json;
  } catch (e) {
    logWarn(
      `Failed to parse config file at ${filePath}, using defaults. Error: ${e}`
    );
    return {};
  }
}

function findPackageJson(startDir: string): string | null {
  // Attempt to find package.json up the directory tree if not in current
  let current = startDir;
  while (true) {
    const candidate = join(current, "package.json");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function validateRootDirectory(
  dir: string,
  skipCheck: boolean,
  verbose: boolean
): void {
  if (!existsSync(dir)) {
    logError(`The specified root directory does not exist: ${dir}`);
    process.exit(1);
  }

  const stats = statSync(dir);
  if (!stats.isDirectory()) {
    logError(`The specified root path is not a directory: ${dir}`);
    process.exit(1);
  }

  if (!skipCheck) {
    const pkgPath = findPackageJson(dir);
    if (!pkgPath) {
      logWarn(
        `package.json not found in directory ${dir} or any parent directory.`
      );
      logWarn(`Consider using --skip-package-check if this is intentional.`);
      // Not exiting because user might still proceed without package.json.
    }
  }

  logDebug(`Root directory validated: ${dir}`, verbose);
}

function attemptGuessLicense(
  rootDir: string,
  currentLicense: string,
  verbose: boolean
): string {
  if (currentLicense.trim()) return currentLicense; // Already have a license
  const candidates = ["LICENSE", "LICENSE.txt", "LICENSE.md"];
  for (const c of candidates) {
    const candidatePath = join(rootDir, c);
    if (existsSync(candidatePath)) {
      const data = readFileSync(candidatePath, "utf8").trim();
      if (data) {
        logDebug(`Guessed license from ${candidatePath}`, verbose);
        return data;
      }
    }
  }
  return DEFAULT_LICENSE_TEXT;
}

function loadIgnorePatterns(rootDir: string, verbose: boolean): IgnoreRules {
  const gitignorePath = join(rootDir, ".gitignore");
  const licenseignorePath = join(rootDir, ".licenseignore");

  let gitignorePatterns: string[] = [];
  let licenseignorePatterns: string[] = [];

  function loadPatterns(path: string): string[] {
    if (!existsSync(path)) return [];
    try {
      const content = readFileSync(path, "utf8");
      return content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"));
    } catch (e) {
      logWarn(`Failed to read ignore file at ${path}: ${e}`);
      return [];
    }
  }

  gitignorePatterns = loadPatterns(gitignorePath);
  licenseignorePatterns = loadPatterns(licenseignorePath);

  logDebug(
    `Loaded ${gitignorePatterns.length} patterns from .gitignore and ${licenseignorePatterns.length} from .licenseignore`,
    verbose
  );

  return { gitignorePatterns, licenseignorePatterns };
}

// Very basic pattern check: For now, just check if entry name matches any pattern.
// In a real scenario, we might implement glob matching or minimatch.
function shouldIgnorePath(
  pathName: string,
  ignores: IgnoreRules,
  config: Config
): boolean {
  const { gitignorePatterns, licenseignorePatterns } = ignores;
  const allPatterns = [
    ...gitignorePatterns,
    ...licenseignorePatterns,
    ...config.ignoredDirectories,
  ];
  return allPatterns.some((pattern) => {
    // Simple substring match for demonstration; replace with minimatch if desired
    return pathName.includes(pattern);
  });
}

function formatLicenseForFileType(
  license: string,
  ext: string,
  config: Config,
  verbose: boolean
): string {
  const style = config.commentStyles[ext];
  if (!style) {
    logWarn(
      `No comment style found for extension ${ext}, falling back to '//' comments.`
    );
    const lines =
      license
        .trim()
        .split("\n")
        .map((l) => `// ${l}`)
        .join("\n") + "\n\n";
    return lines;
  }

  const lines = license.trim().split("\n");
  if (style.end) {
    const commented = lines.map((line) => `${style.start} ${line}`).join("\n");
    return `${commented}${style.end}\n\n`;
  } else {
    return lines.map((line) => `${style.start} ${line}`).join("\n") + "\n\n";
  }
}

function fileIsBinary(content: Buffer, threshold: number): boolean {
  let nonAsciiCount = 0;
  const length = content.length;
  for (let i = 0; i < length; i++) {
    const charCode = content[i];
    // Heuristic: ASCII chars are < 128
    if (charCode > 127) nonAsciiCount++;
  }
  return nonAsciiCount / length > threshold;
}

function fileIsGenerated(content: string): boolean {
  // Heuristic: if file contains "@generated" or "Generated by", skip it
  const markers = ["@generated", "Generated by", "AUTOGENERATED"];
  return markers.some((m) => content.includes(m));
}

function fileHasExistingLicense(content: string): boolean {
  // More robust check: Look for 'Copyright' or 'Licensed under'
  // in the first few lines.
  const lines = content.trimStart().split("\n").slice(0, 15); // first 15 lines
  return lines.some((l) =>
    /(Copyright)|(Licensed under)|(All rights reserved)/i.test(l)
  );
}

function shouldProcessFile(
  path: string,
  config: Config,
  ignores: IgnoreRules,
  verbose: boolean
): boolean {
  const ext = extname(path);
  if (!config.processableExtensions.includes(ext)) {
    logDebug(`Skipping ${path}: not a known processable extension.`, verbose);
    return false;
  }
  if (shouldIgnorePath(path, ignores, config)) {
    logDebug(`Skipping ${path}: matched ignore pattern.`, verbose);
    return false;
  }
  return true;
}

function promptUser(question: string): boolean {
  // A simple synchronous prompt replacement is not built-in to Bun.
  // For demonstration purposes, we assume user always says "yes".
  // In a real scenario, integrate a prompt library or do a sync prompt.
  console.log(question + " [Y/n]");
  return true;
}

let processedCount = 0;
let skippedCount = 0;
let errorCount = 0;

function processFile(
  filePath: string,
  licenseText: string,
  dryRun: boolean,
  config: Config,
  verbose: boolean
): void {
  let contentBuffer: Buffer;
  try {
    contentBuffer = readFileSync(filePath);
  } catch (err) {
    logError(`Failed to read file: ${filePath}. ${err}`);
    errorCount++;
    return;
  }

  const stats = statSync(filePath);
  if (stats.size > config.maxFileSizeBytes) {
    logDebug(`Skipping ${filePath}: exceeds max file size.`, verbose);
    skippedCount++;
    return;
  }

  if (fileIsBinary(contentBuffer, config.binaryFileThreshold)) {
    logDebug(`Skipping ${filePath}: appears to be binary.`, verbose);
    skippedCount++;
    return;
  }

  const content = contentBuffer.toString("utf8");
  if (fileIsGenerated(content)) {
    logDebug(`Skipping ${filePath}: appears to be generated code.`, verbose);
    skippedCount++;
    return;
  }

  if (fileHasExistingLicense(content)) {
    logDebug(`Skipping ${filePath}: already has a license header.`, verbose);
    skippedCount++;
    return;
  }

  const ext = extname(filePath);
  const formattedLicense = formatLicenseForFileType(
    licenseText,
    ext,
    config,
    verbose
  );
  const newContent = formattedLicense + content;

  if (dryRun) {
    logInfo(`Would add license header to: ${filePath}`);
  } else {
    try {
      writeFileSync(filePath, newContent);
      logInfo(`License header added to: ${filePath}`);
      processedCount++;
    } catch (err) {
      logError(`Failed to write file: ${filePath}. ${err}`);
      errorCount++;
    }
  }
}

function processDirectory(
  dir: string,
  licenseText: string,
  dryRun: boolean,
  config: Config,
  ignores: IgnoreRules,
  verbose: boolean
): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    logError(`Failed to read directory: ${dir}. ${err}`);
    errorCount++;
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      logDebug(`Skipping hidden file/directory: ${entry.name}`, verbose);
      continue;
    }

    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (shouldIgnorePath(fullPath, ignores, config)) {
        logDebug(`Skipping ignored directory: ${entry.name}`, verbose);
        continue;
      }
      processDirectory(fullPath, licenseText, dryRun, config, ignores, verbose);
    } else if (entry.isFile()) {
      if (shouldProcessFile(fullPath, config, ignores, verbose)) {
        processFile(fullPath, licenseText, dryRun, config, verbose);
      } else {
        skippedCount++;
      }
    } else {
      logDebug(
        `Skipping non-file, non-directory entry: ${entry.name}`,
        verbose
      );
    }
  }
}

// -------------------------------------
// Main Execution
// -------------------------------------
function main(): void {
  const {
    rootDir,
    dryRun,
    licenseText: cliLicenseText,
    skipPackageJsonCheck,
    interactive,
    verbose,
    configPath,
  } = parseCLIArgs();

  validateRootDirectory(rootDir, skipPackageJsonCheck, verbose);

  const partialConfig = loadConfig(configPath || "", verbose);
  const mergedConfig: Config = {
    processableExtensions:
      partialConfig.processableExtensions ||
      DEFAULT_CONFIG.processableExtensions,
    commentStyles: {
      ...DEFAULT_CONFIG.commentStyles,
      ...(partialConfig.commentStyles || {}),
    },
    ignoredDirectories: [
      ...DEFAULT_CONFIG.ignoredDirectories,
      ...(partialConfig.ignoredDirectories || []),
    ],
    maxFileSizeBytes:
      partialConfig.maxFileSizeBytes ?? DEFAULT_CONFIG.maxFileSizeBytes,
    binaryFileThreshold:
      partialConfig.binaryFileThreshold ?? DEFAULT_CONFIG.binaryFileThreshold,
  };

  const finalLicenseText = attemptGuessLicense(
    rootDir,
    cliLicenseText,
    verbose
  );
  const ignores = loadIgnorePatterns(rootDir, verbose);

  logInfo(`Root Directory: ${rootDir}`);
  logInfo(`Dry Run Mode: ${dryRun ? "Enabled" : "Disabled"}`);
  logInfo(`Interactive Mode: ${interactive ? "Enabled" : "Disabled"}`);
  logInfo(`Verbose: ${verbose ? "Yes" : "No"}`);
  logInfo(`Using Config: ${configPath || "Defaults"}`);
  console.log("");

  // If interactive mode enabled, prompt user before large operations:
  if (interactive) {
    // Estimate how many files we might process? For now, just prompt once.
    if (!promptUser("Proceed with adding license headers?")) {
      console.log("Operation cancelled by user.");
      process.exit(0);
    }
  }

  processDirectory(
    rootDir,
    finalLicenseText,
    dryRun,
    mergedConfig,
    ignores,
    verbose
  );

  // Summary
  console.log("\n\x1b[1mOperation Complete\x1b[0m\n");
  logInfo(`Processed: ${processedCount} files`);
  logInfo(`Skipped: ${skippedCount} files`);
  logInfo(`Errors: ${errorCount} files`);
}

main();
