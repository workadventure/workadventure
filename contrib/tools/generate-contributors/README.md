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
- Optional `displayName`, `ensureLogins` and `seedCommit` preserve explicit credits. Seed avatar account IDs resolve renamed users without attributing their work to a reused login.
- As in OpenClaw, default avatars are detected by image dimensions and cached in the README's hidden block. Remove a login from that block to check its avatar again.

Only the contributor marker blocks in the root README are rewritten. Other content is preserved.

## Automatic updates

In the upstream repository, merging a PR into `master` triggers generation from the latest `master` checkout. An existing
`automation/update-contributors` PR is updated, or one is opened when the generated README differs. Merging that update
PR does not trigger another update. Closed-but-unmerged PRs and fork repositories do not run the write job.

The repository must allow GitHub Actions to create pull requests. The workflow uses `GITHUB_TOKEN`, changes only
`README.md` in the update PR, and does not merge it or alter branch protection. README changes become visible on `master`
after the update PR is merged. PRs created with `GITHUB_TOKEN` do not automatically trigger `push` or `pull_request`
workflows. If required checks apply, a maintainer can close and reopen the update PR to trigger the normal PR checks.
