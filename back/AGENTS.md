# AGENTS.md - back/

Backend API (gRPC + HTTP).

## Prerequisite

The backend imports generated protobuf code. If it is missing or protobufs changed:

```bash
cd messages
npm install
npm run ts-proto
```

## Common commands

```bash
cd back

npm run typecheck
npm run lint-fix
npm run pretty
npm test
# Test only one file
npm test -- --run tests/CommunicationManager.test.ts
```

## Related guides

- `../docs/agent/testing-vitest.md`
- `../docs/agent/typescript-style.md`
- `../docs/agent/error-handling.md`
