import { defaultFrontConfiguration } from "../tests/setup/defaultEnv";

// The app reads its runtime configuration from `window.env`, injected by the server in
// production. Storybook has no such injection, so any component that (transitively) reads the
// front configuration at import time would throw "Cannot read properties of undefined". Provide
// the same default the Vitest unit setup uses. Imported first in preview.ts so it runs before
// any story module is evaluated.
if (typeof window !== "undefined" && window.env === undefined) {
    window.env = defaultFrontConfiguration;
}
