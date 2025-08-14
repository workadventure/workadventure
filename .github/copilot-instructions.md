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
- **`play/`** - Main frontend application (Svelte + Phaser.js game engine)
- **`back/`** - Backend API server with gRPC and HTTP endpoints  
- **`messages/`** - Protocol Buffer definitions for service communication
- **`map-storage/`** - Map storage and management service
- **`uploader/`** - File upload service
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

# Add required entries to /etc/hosts (Linux/macOS):
echo "127.0.0.1 oidc.workadventure.localhost redis.workadventure.localhost play.workadventure.localhost traefik.workadventure.localhost matrix.workadventure.localhost extra.workadventure.localhost icon.workadventure.localhost map-storage.workadventure.localhost uploader.workadventure.localhost maps.workadventure.localhost api.workadventure.localhost front.workadventure.localhost" >> /etc/hosts
```

### Development Environment (Docker - Recommended)
**Time required**: 5-10 minutes for initial startup

```bash
# Start development environment
docker-compose up

# With OIDC test server (for authentication testing)
docker-compose -f docker-compose.yaml -f docker-compose-oidc.yaml up

# Access: http://play.workadventure.localhost
# Traefik dashboard: http://traefik.workadventure.localhost
```

**Known Issues & Workarounds**:
- CORS/502 errors: Restart specific containers: `docker-compose restart play back`
- Windows users: MUST run `git config --global core.autocrlf false` before cloning
- macOS users: Requires at least 6GB RAM allocated to Docker

### Manual Build Process (Without Docker)
**⚠️ Protocol Buffer Dependency**: Messages MUST be built first and require protoc

1. **Install Messages Dependencies & Build** (ALWAYS FIRST):
```bash
cd messages
npm install
npm run ts-proto  # Generates TypeScript from .proto files
```

2. **Build Individual Services** (order matters):
```bash
# Backend service
cd back
npm install --workspace=workadventureback  # Install from root
npm run typecheck
npm run build  # TypeScript compilation

# Frontend service  
cd play
npm install --workspace=workadventure-play
npm run typesafe-i18n  # Generate i18n files (REQUIRED)
npm run build  # Time: 2-5 minutes, may need NODE_OPTIONS=--max-old-space-size=16384
npm run build-iframe-api  # Build API for embeds

# Map storage
cd map-storage  
npm install --workspace=map-storage
npm run build

# Uploader
cd uploader
npm install --workspace=workadventureuploader
npm run typecheck
```

### Testing

#### Unit Tests
```bash
# Individual services
cd play && npm test
cd back && npm test  
cd map-storage && npm test
cd libs/map-editor && npm test
cd libs/shared-utils && npm test
cd libs/store-utils && npm test
```

#### End-to-End Tests
**Time required**: 10-20 minutes for full suite

```bash
cd tests
npm install
npx playwright install --with-deps

# Development environment tests
docker-compose -f docker-compose.yaml -f docker-compose-oidc.yaml up -d
npm run test

# Production-like tests  
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose -f docker-compose.yaml -f docker-compose-oidc.yaml -f docker-compose.e2e.yml up -d --build
npm run test-prod-like

# Single test with UI
npm run test-headed -- tests/[test-file.ts]
```

### Linting & Formatting
**ALWAYS** run before committing:

```bash
# Install precommit hooks (REQUIRED after first clone)
npm install
npm run prepare

# Manual linting for each service
cd play && npm run lint && npm run svelte-check && npm run pretty-check
cd back && npm run lint && npm run pretty-check  
cd map-storage && npm run lint && npm run pretty-check
cd tests && npm run lint

# Auto-fix issues
cd [service] && npm run lint-fix && npm run pretty
```

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
**Solution**: Check and kill processes:
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

### Important Commands Reference
```bash
# Development
docker-compose up                          # Start all services
npm run dev                               # Start individual service in dev mode

# Building  
npm run build                             # Build service
npm run typecheck                         # Type validation
npm run typesafe-i18n                     # Generate i18n (play service)

# Testing
npm test                                  # Unit tests
npm run test-prod-like                    # E2E tests (tests/)

# Code Quality
npm run lint                              # ESLint checking
npm run pretty                            # Prettier formatting  
npm run svelte-check                      # Svelte validation (play service)
```

## Trust These Instructions
These instructions are comprehensive and validated. Only search for additional information if:
1. A specific command fails with an error not covered above
2. You need details about a specific API or implementation not documented here
3. The build process has changed significantly (check git history first)

When in doubt, prioritize the Docker development environment over manual builds, as it handles complex dependencies automatically.