# Copilot Instructions for WorkAdventure

## Repository Overview

WorkAdventure is a comprehensive platform for creating customizable collaborative virtual worlds (metaverse). The project consists of multiple interconnected services built with TypeScript/JavaScript, using modern web technologies including Phaser.js game engine, Svelte, and Docker for development.

### High-Level Details

- **Type**: Multi-service web application with game engine components
- **Size**: Large monorepo (~1.5GB) with 8 main services and shared libraries
- **Languages**: TypeScript (primary), JavaScript, some PHP for maps
- **Frameworks**: Phaser.js (game engine), Svelte (UI), Express.js (APIs), Protocol Buffers (communication)
- **Target Runtime**: Node.js 20-22, modern browsers
- **Architecture**: Microservices with Docker development environment

## Project Architecture

### Main Services
- **`play/`** - Main frontend application + Node websocket dispatcher (Svelte + Phaser.js game engine)
  - **`play/src/front`** - contains the front code (Svelte + Phaser, built using Vite)
  - **`play/src/pusher`** - contains the server-side code (mostly establishes the websocket connection to the front and forwards calls to the back)
- **`back/`** - Backend API server with gRPC and HTTP endpoints  
- **`messages/`** - Protocol Buffer definitions for service communication
- **`map-storage/`** - Map storage and management service (talks to back, stores map on disk or in S3 compatible service)
- **`uploader/`** - File upload service (deprecated)
- **`tests/`** - End-to-end tests using Playwright

### Shared Libraries (`libs/`)
- **`map-editor/`** - Map editing functionality and types
- **`shared-utils/`** - Common utilities across services
- **`math-utils/`** - Mathematical operations and utilities
- **`store-utils/`** - State management utilities for Svelte
- **`messages/`** - Generated TypeScript types from Protocol Buffers
- **`eslint-config/`** - Shared ESLint configuration

### Configuration Files
- **Root**: `package.json` (workspace config), `.env.template`, `docker-compose.yaml`
- **Linting**: ESLint configs in each service, Prettier configs (`.prettierrc.json`)
- **TypeScript**: `tsconfig.json` in each service with inheritance
- **Build**: Vite for frontend, native TypeScript compilation for backend
- **Testing**: Vitest for unit tests, Playwright for e2e tests

## Build Instructions

### Prerequisites
- **Node.js**: Version 20-22 required
- **Docker & Docker Compose**: For development environment
- **Protocol Buffers**: Needed for message generation (handled by Docker in dev)

### Environment Setup
**ALWAYS** start with environment setup before any build operations:

```bash
# Copy environment template (REQUIRED)
cp .env.template .env

# Start development environment (OIDC test server enabled by default)
docker-compose up

# To disable OIDC (for anonymous access):
# docker-compose -f docker-compose.yaml -f docker-compose-no-oidc.yaml up

# Access: http://play.workadventure.localhost/_/global/maps.workadventure.localhost/starter/map.json
```

### Manual Build / Typecheck
**⚠️ Protocol Buffer Dependency**: Messages MUST be built first and require protoc

1. **Install Messages Dependencies & Build** (ALWAYS FIRST):
```bash
cd messages
npm install
npm run ts-proto  # Generates TypeScript from .proto files
```

2. **Running Individual Services**:
```bash
# Backend service
cd back
npm install --workspace=workadventureback  # Install from root
npm run typecheck
npm run lint-fix # ESLint with auto fix
npm run test -- --watch=false # Run vitest tests

# Play service  
cd play
npm install --workspace=workadventure-play
npm run typesafe-i18n  # Generate i18n files (REQUIRED)
npm run build  # Time: 2-5 minutes, may need NODE_OPTIONS=--max-old-space-size=16384, builds Vite (front)
npm run build-iframe-api  # Build API for embeds
npm run lint-fix # ESLint with auto fix
npm run svelte-check # Svelte-check checks
npm run test -- --watch=false # Run vitest tests

# Map storage
cd map-storage  
npm install --workspace=map-storage
npm run typecheck
npm run test -- --watch=false # Run vitest tests
npm run lint-fix # ESLint with auto fix
```

### End-to-End Tests
**Time required**: 10-30 minutes for full suite

```bash
cd tests
npm install
npx playwright install --with-deps

# Development environment tests (OIDC enabled by default)
docker-compose up -d
npm run lint-fix # ESLint tests for E2E tests 

# Single test with UI
npm run test-headed-chrome -- tests/[test-file.ts]
# You can read the report in the playwright-report directory
```

### Linting & Formatting
**ALWAYS** run before committing:

```bash
# Install precommit hooks (REQUIRED after first clone)
npm install

# Manual linting for each service (standardized commands)
cd play && npm run lint-fix && npm run svelte-check && npm run pretty
cd back && npm run lint-fix && npm run pretty
cd map-storage && npm run lint-fix && npm run pretty
cd tests && npm run lint-fix
```

**Standardized npm scripts**: All services and libraries use:
- `npm run lint` - runs ESLint to check for errors without fixing them
- `npm run lint-fix` - runs ESLint with `--fix` to automatically fix errors where possible

## Validation Pipeline

### Pre-commit Checks (Automated via Husky)
The `.husky/pre-commit` hook automatically runs:
- Prettier formatting
- ESLint linting  
- Svelte-check type checking
- TypeScript compilation checks

### GitHub Actions CI (`.github/workflows/continuous_integration.yml`)
**ALWAYS** passes before merge:
- Build all services with dependency validation
- TypeScript type checking (`npm run typecheck`)
- Linting (`npm run lint`) 
- Unit tests (`npm test`)
- Prettier formatting check (`npm run pretty-check`)
- Svelte component validation (`npm run svelte-check`)

### Docker Build Validation
Production Docker images built and tested in CI:
- Multi-architecture builds (AMD64, ARM64)
- Integration tests with real database
- End-to-end Playwright tests across browsers

## Common Issues & Solutions

### Protocol Buffer Issues
**Symptom**: "Cannot find module 'ts-proto-generated'"
**Solution**: Build messages first: `cd messages && npm run ts-proto`

### Memory Issues During Build  
**Symptom**: "JavaScript heap out of memory"
**Solution**: Set environment variable: `export NODE_OPTIONS=--max-old-space-size=16384`

### Port Conflicts
**Symptom**: "Port already in use" errors
**Solution**: Check and kill processes or "docker-compose down":
```bash
lsof -ti:3000,3001,8080,9229 | xargs kill -9
```

### Docker Issues
**Symptom**: Containers exit with status 125/137
**Solution**: 
- macOS: Increase Docker memory to 6GB+
- All platforms: `docker system prune -a` to clear old images

### GRPC/Network Issues
**Symptom**: "ENOTFOUND node-precompiled-binaries.grpc.io"
**Solution**: Use Docker development environment which handles grpc-tools installation

## Key Files & Locations

### Root Configuration
- `package.json` - Workspace configuration with 8 workspaces
- `.env.template` - Environment variables template
- `docker-compose.yaml` - Development environment (primary)
- `wait-proto.sh` - Script to wait for Protocol Buffer generation
- `npm-install.sh` - Thread-safe npm install script

### Service Entry Points
- `play/src/server.ts` - Frontend server (Svelte app + Phaser game)
- `back/src/server.ts` - Backend API server
- `map-storage/src/server.ts` - Map storage service
- `uploader/server.ts` - File upload service

### Build Configurations
- `play/vite.config.ts` - Frontend build config (Vite + Svelte)
- `play/iframe-api.vite.config.ts` - IFrame API build
- `*/tsconfig.json` - TypeScript configurations (service-specific)
- `messages/protos/*.proto` - Protocol Buffer definitions

## I18n

Any message added to the code should be translated in the supported languages.
WorkAdventure uses typesafe-i18n and the translation files are in `play/src/i18n/[language]/[module].ts`

Audit missing translation keys with the helper script:

- Summary across all locales (source defaults to `en-US`):
  - From `play/` run `npm run i18n:diff`
  - This prints, for each locale, the number of missing keys and missing files.

- Detailed diff for a specific locale:
  - From `play/` run `npm run i18n:diff -- <language-code>` (e.g. `npm run i18n:diff -- fr-FR`)
  - Optionally compare against a different source locale: `npm run i18n:diff -- <target-locale> <source-locale>`

## Trust These Instructions
These instructions are comprehensive and validated. Only search for additional information if:
1. A specific command fails with an error not covered above
2. You need details about a specific API or implementation not documented here
3. The build process has changed significantly (check git history first)

When in doubt, prioritize the Docker development environment over manual builds, as it handles complex dependencies automatically.