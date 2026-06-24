# E2E report viewer

Download and open a Playwright HTML report from the latest GitHub Actions run associated with the current branch or pull request.

## Requirements

- Node.js and the repository dependencies
- [GitHub CLI](https://cli.github.com/) authenticated with access to the repository

## Usage

From the repository root:

```bash
npm run e2e:report
```

The command finds the current pull request, selects the newest `build-test-and-deploy.yml` run containing Playwright artifacts, and asks which browser and shard to open. Reports are cached under `~/.cache/workadventure/e2e-reports/`.

Filters and non-interactive usage:

```bash
npm run e2e:report -- --project firefox --shard 3
npm run e2e:report -- --run 28080895737
npm run e2e:report -- --list
npm run e2e:report -- --refresh
```

Run `npm run e2e:report -- --help` for all options. Stop the report server with Ctrl+C.
