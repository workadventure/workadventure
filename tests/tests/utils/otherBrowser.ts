import { devices, type Browser, type BrowserContextOptions } from "@playwright/test";
import { chromium, firefox, webkit, type BrowserType } from "playwright-core";

// The test runner stores the project's launch flags on the shared Playwright object, and every browser type applies
// them; another engine rejects them. They are cleared while `run` launches a browser of another engine, and restored
// afterwards for the project's own browser.
async function withoutProjectLaunchOptions<T>(type: BrowserType, run: () => Promise<T>): Promise<T> {
    const playwright = (type as unknown as { _playwright: Record<string, unknown> })._playwright;
    const saved = playwright._defaultLaunchOptions;
    playwright._defaultLaunchOptions = undefined;
    try {
        return await run();
    } finally {
        playwright._defaultLaunchOptions = saved;
    }
}

/** Launches a browser of another engine than the test's project, with fake media devices where it has them. */
export async function launchOtherBrowser(engine: string): Promise<Browser> {
    switch (engine) {
        case "webkit":
            return withoutProjectLaunchOptions(webkit, () => webkit.launch());
        case "firefox":
            return withoutProjectLaunchOptions(firefox, () =>
                firefox.launch({
                    firefoxUserPrefs: {
                        "media.navigator.streams.fake": true,
                        "permissions.default.microphone": 1,
                        "permissions.default.camera": 1,
                    },
                }),
            );
        default:
            return withoutProjectLaunchOptions(chromium, () =>
                chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] }),
            );
    }
}

/**
 * Context options for the pages of a browser from `launchOtherBrowser`. The test runner gives every context the
 * project's options it does not set itself: the Chromium project's user agent (livekit-client would take Firefox for
 * Chrome) and its camera permissions, which Firefox rejects. Firefox gets its camera through its preferences instead.
 */
export function otherBrowserContextOptions(engine: string): BrowserContextOptions {
    const device = { firefox: "Desktop Firefox", webkit: "Desktop Safari" }[engine] ?? "Desktop Chrome";
    const options: BrowserContextOptions & { defaultBrowserType?: string } = {
        ...devices[device],
        permissions: engine === "chromium" ? ["microphone", "camera"] : [],
    };
    delete options.defaultBrowserType;
    return options;
}
