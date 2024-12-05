# OpenAPI2MD

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#) [![Version](https://img.shields.io/badge/version-0.0.1-blue)](#) [![License](https://img.shields.io/badge/license-Apache%202.0-blue)](#)

**OpenAPI2MD** is a command-line tool designed to convert your **OpenAPI specification** into elegant, human-readable **Markdown documentation**. Ideal for API developers, technical writers, and project maintainers, OpenAPI2MD streamlines the documentation process and ensures your team can quickly generate, update, and maintain API docs with minimal effort. By leveraging modern tooling, templates, and semantic version management, this project aims to deliver a seamless developer experience and foster a collaborative ecosystem around your APIs.

> *Unique Value*: OpenAPI2MD not only generates documentation but also integrates semantic version management and automated reference resolution—helping you keep your documentation consistent, accurate, and aligned with evolving APIs.

## Features

- **Automated $ref Dereferencing**: Seamlessly resolves all `$ref` links, ensuring that the final Markdown output is self-contained and easy to follow.
- **Flexible Templates (Handlebars)**: *Template System*: Create custom Handlebars templates to shape your documentation’s structure and style, enabling full branding and formatting control.
- **Single or Multiple File Output**: Generate one comprehensive Markdown file or split the docs into multiple files for easier navigation.
- **Semantic Version Management**: Track, increment, and validate your project’s version history with a built-in version manager that prevents regressions and logs all updates.
- **Intuitive CLI Commands**: A user-friendly CLI interface allows you to quickly generate docs, bump versions, and configure the tool with minimal complexity.
- **YAML and JSON Support**: Use either YAML or JSON OpenAPI specs, ensuring compatibility with your existing workflow.

## Installation

Before installing, ensure you have **Bun** (a fast JavaScript runtime) and **Node.js** available on your system.

**Prerequisites**:  
- *Bun Runtime*: [Bun](https://bun.sh) version 1.1.38 or later  
- *Node.js Environment*: Recommended Node.js LTS  
- *TypeScript*: As a peer dependency, ensure TypeScript ^5.0.0 is available

**Steps**:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/openapi2md.git
   cd openapi2md
   ```

2. Install dependencies using Bun:
   ```bash
   bun install
   ```

If you encounter any installation issues, ensure you have Bun properly installed. Consult [Bun’s documentation](https://bun.sh/docs) for troubleshooting steps.

## Usage

To generate Markdown documentation from your OpenAPI specification:

```bash
bun start ./path/to/openapi.yaml
```

**Common Options**:

- `--output` (`-o`): Specify output file or directory.
- `--single` or `--multiple`: Choose single-file or multi-file output.
- `--template` (`-t`): Use a custom Handlebars template.
- `--headings`: Set the starting heading level for your docs.
- `--toc`: Include a table of contents.

**Example**: Generate a single Markdown file with a custom template and a TOC:

```bash
bun run src/main.ts ./my-api.yaml --output docs/api.md --single --template ./my-template.hbs --toc
```

**Version Management**:  
Use the built-in version bump command to increment your project version and update references:

```bash
bun run src/main.ts version bump patch
```

This updates your `package.json` and logs the version increment, preventing accidental regressions.

## Configuration

While most configuration is handled via CLI options, you can further customize the documentation by providing a custom Handlebars template:

1. Create a custom template file (e.g., `my-template.hbs`).
2. Pass it to the CLI using `--template ./my-template.hbs`.

To configure version management paths or logging behaviors, adjust the `VersionManager` or `ProjectRefUpdater` references in code. For most users, no additional configuration is needed beyond templates and standard CLI flags.

*Tip*: If your OpenAPI spec changes, simply rerun the command to regenerate fresh docs. The version manager will ensure no backward version moves.

## Contributing

Contributions are warmly welcomed! Whether you’re fixing a bug, adding a feature, or improving documentation, your input strengthens the community.

- **Issues & Requests**: Submit issues or feature requests on our GitHub tracker.
- **Pull Requests**: Fork the repo, create a new branch, implement your changes, and open a PR.
- **Coding Standards**: Follow TypeScript strict mode and ensure passing builds before submitting.

By contributing, you help shape a tool that streamlines API documentation for countless developers.

## License

OpenAPI2MD is released under the **Apache License 2.0**. You are free to use, modify, and distribute it, subject to the following conditions:

1. You must include a copy of the license in any redistribution
2. You must clearly indicate any modifications made to the code
3. You must retain all copyright, patent, trademark, and attribution notices

For the full license text, see the [LICENSE](./LICENSE) file.

## Acknowledgements

We extend our gratitude to the open-source community and the authors of essential packages that power this project:

- [@apidevtools/json-schema-ref-parser](https://github.com/APIDevTools/json-schema-ref-parser)
- [Handlebars](https://handlebarsjs.com/)
- [Yargs](https://yargs.js.org/)
- [Zod](https://github.com/colinhacks/zod)
- [OpenAPI-Types](https://www.npmjs.com/package/openapi-types)
- [Bun](https://bun.sh)

Your innovations, guidance, and contributions have made OpenAPI2MD possible. Together, we build tools that empower developers worldwide.
