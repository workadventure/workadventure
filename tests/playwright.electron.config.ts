import type { PlaywrightTestConfig } from "@playwright/test";
import base from "./playwright.config";

/**
 * The desktop app (desktop/electron), driven through Playwright's Electron support. Kept out of the
 * browser matrix: the app is Chromium, and the other users of a test are Chromium pages.
 * See tests/desktop_mini_window.electron.ts for what it needs.
 */
const config: PlaywrightTestConfig = {
    ...base,
    testMatch: "*.electron.ts",
    projects: (base.projects ?? []).filter((project) => project.name === "chromium"),
};

export default config;
