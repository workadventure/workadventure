# Svelte Components

The frontend uses Svelte 5 runes.

- Create AbortController at component init if needed, call abort() in onDestroy.
- Avoid styles as much as possible; prefer Tailwind classes

## Storybook

`play` uses Storybook (with `@storybook/addon-svelte-csf`) to develop and test UI components in isolation.

- Run it locally with `npm run storybook`.
- Stories are colocated with their component: `Chip.stories.svelte` sits next to `Chip.svelte`.
- Story children are forwarded into the component as its `children` prop, so write `<Story name="Default">Label</Story>`
  — do **not** re-instantiate the component inside the story (that renders it nested inside itself). Let `args` drive the
  component's props. Use `asChild` only when you deliberately want the story body to be the output (it ignores `args`).
- Stories are exercised as tests in a real browser via the `storybook` Vitest project; run them with
  `npm run test:storybook`. See `testing-vitest.md`.
