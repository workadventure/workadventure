# Contributor avatars

Run from the repository root with Node.js 24 and an authenticated GitHub CLI:

```sh
node contrib/tools/generate-contributors/update-contributors.mts
node --test contrib/tools/generate-contributors/update-contributors.test.mjs
```

No npm installation is needed. Generation requires a complete Git checkout and network access; tests use local fixtures.

The generator adapts [OpenClaw's implementation](https://github.com/openclaw/openclaw/blob/65c8b06f2e42f4788d45da3b5573a761ddaf58fd/scripts/update-clawtributors.ts):

- Linked 48×48 avatars, sorted by `(commits * 2 + merged PRs * 10 + sqrt(changed lines)) * tenure`.
- `tenure = 1 + min(1, contributor age / repository age)^2 * 0.5`, using the first commit date.
- Changed lines exclude `docs/`; commit and PR credit still includes documentation. PR counts cover the latest 5,000 merged PRs.
- GitHub noreply addresses and optional `nameToLogin` / `emailToLogin` mappings resolve commit authors.
- Numeric noreply account IDs retain credit across renames; merged PR and docs-only authors remain candidates while contributor aggregates catch up. Aggregate commit counts can still lag behind a merge.
- Bot accounts returned by GitHub are retained, matching OpenClaw; there is no blanket bot exclusion.
- Optional `displayName`, `ensureLogins` and `seedCommit` preserve explicit credits. Seed avatar account IDs resolve renamed users without attributing their work to a reused login.
- As in OpenClaw, default avatars are detected by image dimensions and cached in the README's hidden block. Remove a login from that block to check its avatar again.

Only the contributor marker blocks in the root README are rewritten. Other content is preserved.

## Automatic updates

In the upstream repository, merging a PR into `master` triggers generation from the latest `master` checkout. An existing
`automation/update-contributors` PR is updated, or one is opened when the generated README differs. Merging that update
PR does not trigger another update. Closed-but-unmerged PRs and fork repositories do not run the write job.

The repository must allow GitHub Actions to create pull requests. The workflow uses `GITHUB_TOKEN`, changes only
`README.md` in the update PR, and does not merge it or alter branch protection. README changes become visible on `master`
after the update PR is merged. `GITHUB_TOKEN`-created or updated PRs can produce approval-required `pull_request`
workflow runs; a user with write access can approve these from the PR page. They do not trigger `push` workflows.
See [GitHub's event documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request).
