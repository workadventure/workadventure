import type { Browser } from "@playwright/test";
import { chromium, firefox, webkit, type BrowserType } from "playwright-core";

// The test runner stores the project's launch flags and context options (camera permissions...) on the shared
// Playwright object, and every browser type applies them; another engine rejects them. They are cleared while `run`
// creates a browser of another engine and its pages, and restored afterwards for the project's own browser.
export async function withoutProjectDefaults<T>(type: BrowserType, run: () => Promise<T>): Promise<T> {
    const playwright = (type as unknown as { _playwright: Record<string, unknown> })._playwright;
    const saved = { launch: playwright._defaultLaunchOptions, context: playwright._defaultContextOptions };
    playwright._defaultLaunchOptions = undefined;
    playwright._defaultContextOptions = undefined;
    try {
        return await run();
    } finally {
        playwright._defaultLaunchOptions = saved.launch;
        playwright._defaultContextOptions = saved.context;
    }
}

/** Launches a browser of another engine than the test's project, with fake media devices where it has them. */
export async function launchOtherBrowser(engine: string): Promise<Browser> {
    switch (engine) {
        case "webkit":
            return withoutProjectDefaults(webkit, () => webkit.launch());
        case "firefox":
            return withoutProjectDefaults(firefox, () =>
                firefox.launch({
                    firefoxUserPrefs: {
                        "media.navigator.streams.fake": true,
                        "permissions.default.microphone": 1,
                        "permissions.default.camera": 1,
                    },
                }),
            );
        default:
            return withoutProjectDefaults(chromium, () =>
                chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] }),
            );
    }
}
