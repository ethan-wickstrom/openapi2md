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

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { FileSystemStorage } from '../io/storage';
import { VersionManager, type SemanticVersion } from '../core/version-manager';

export interface CliOptions {
  input: string;
  output?: string;
  single: boolean;
  multiple: boolean;
  template?: string;
  headings: number;
  toc: boolean;
  version: SemanticVersion;
}

export async function parseCliArgs(): Promise<CliOptions> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const packageJsonPath = join(__dirname, '../../package.json');
  const versionLogPath = join(__dirname, '../../.version-log.json');
  const projectRoot = join(__dirname, '../..');
  const storage = new FileSystemStorage();
  const versionManager = new VersionManager(storage, packageJsonPath, versionLogPath, projectRoot);

  const currentVersion = await versionManager.getCurrentVersion();

  const argv = await yargs(hideBin(process.argv))
    .scriptName('openapi2md')
    .usage('$0 [options] <input-file>')
    .command('version bump <level>', 'Bump the project version (major, minor, patch)', (yargs) => {
      return yargs.positional('level', {
        describe: 'Which part of version to bump',
        choices: ['major', 'minor', 'patch'] as const
      });
    }, async (args) => {
      const level = args.level as 'major'|'minor'|'patch';
      try {
        await versionManager.incrementVersion(level, 'Bumped version via CLI command');
        const newVersion = await versionManager.getCurrentVersion();
        console.log(`Version successfully updated to ${newVersion} and recorded in the log.`);
        process.exit(0);
      } catch (err:any) {
        console.error('Error during version bump:', err.message);
        process.exit(1);
      }
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      describe: 'Output file or directory',
    })
    .option('single', {
      alias: 's',
      type: 'boolean',
      default: true,
      describe: 'Generate a single Markdown file (default)',
      conflicts: 'multiple'
    })
    .option('multiple', {
      alias: 'm',
      type: 'boolean',
      default: false,
      describe: 'Generate multiple Markdown files (one per path)',
      conflicts: 'single'
    })
    .option('template', {
      alias: 't',
      type: 'string',
      describe: 'Use a custom Handlebars template file'
    })
    .option('headings', {
      type: 'number',
      default: 1,
      describe: 'Heading level to start with'
    })
    .option('toc', {
      type: 'boolean',
      default: false,
      describe: 'Include a table of contents'
    })
    .version(currentVersion)
    .help('h')
    .alias('h', 'help')
    // If the command is not 'version bump', we demand an input file to generate docs.
    .demandCommand(1, 'You must specify an input file or use a subcommand.')
    .parseAsync();

  // For normal doc generation runs (not `version bump`), ensure current version validity:
  await versionManager.ensureCurrentVersionValid();

  return {
    input: argv._[0] as string,
    output: argv.output,
    single: argv.single,
    multiple: argv.multiple,
    template: argv.template,
    headings: argv.headings,
    toc: argv.toc,
    version: currentVersion
  };
}
