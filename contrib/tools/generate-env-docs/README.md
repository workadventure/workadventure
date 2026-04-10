# Environment Variables Documentation Generator

This tool automatically generates documentation for WorkAdventure environment variables from Zod schemas.

## Overview

The tool extracts environment variable definitions from the following files:
- `play/src/pusher/enums/EnvironmentVariableValidator.ts` (Play service)
- `back/src/Enum/EnvironmentVariableValidator.ts` (Back service)
- `map-storage/src/Enum/EnvironmentVariableValidator.ts` (Map Storage service)

It generates a comprehensive Markdown document at `docs/others/self-hosting/env-variables.md` with tables listing all variables, their types, whether they're required, and their descriptions.

## Usage

### Generate documentation

From the root of the WorkAdventure repository:

```bash
npm run generate-env-docs
```

This will:
1. Extract all environment variables from the three services
2. Generate a Markdown file with tables for each service
3. Create a separate section for deprecated variables (OPID_*)

### Check if documentation is up to date

```bash
npm run check-env-docs
```

This command:
- Regenerates the documentation in memory
- Compares it with the existing file
- Exits with code 1 if they differ

This is used in CI to ensure the documentation stays synchronized with the code.

## Development

### Install dependencies

```bash
cd contrib/tools/generate-env-docs
npm install
```

### Local scripts

```bash
# Generate documentation
npm run generate

# Check if up to date
npm run check
```

## How it works

1. **Extraction** (`src/extractor.ts`): Introspects Zod schemas to extract variable metadata (name, type, required, description)
2. **Generation** (`src/markdown-generator.ts`): Formats the extracted data into Markdown tables
3. **Scripts**:
   - `src/generate.ts`: Writes the generated Markdown to the docs folder
   - `src/check.ts`: Validates that the documentation is up to date

## Integration

### Pre-commit hook

The generator runs automatically before each commit via the `.husky/pre-commit` hook, ensuring the documentation is always up to date.

### CI Pipeline

The `check-env-docs` job in `.github/workflows/continuous_integration.yml` validates that the documentation hasn't been manually edited or forgotten.

## Notes

- Variables without a `.describe()` call in their Zod schema will show "-" as their description
- The tool respects the declaration order of variables in the source files
- Deprecated `OPID_*` variables are automatically placed in a separate section at the end
