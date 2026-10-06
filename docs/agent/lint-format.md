# Linting & Formatting

```bash
npm run typecheck
npm run lint
npm run lint-fix
npm run pretty
npm run pretty-check
```

Notes:
- `npm run svelte-check` is for the `play/` project only.
- Full-project typecheck and lint can be slow (linting can take ~20 minutes). Consider:

```bash
npx lint-staged
```
