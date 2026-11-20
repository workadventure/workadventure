import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import type { Browser, ElectronApplication, Page } from "@playwright/test";
import { _electron as electron, expect, test } from "@playwright/test";
import { play_url } from "./urls";

/**
 * The desktop app (desktop/electron), for the tests run by playwright.electron.config.ts (`npm run test-electron`).
 * Needs `npm ci && npm run build` in desktop/electron, and xvfb-run on Linux.
 */

const desktopDir = fileURLToPath(new URL("../../../desktop/electron/", import.meta.url));
const require = createRequire(import.meta.url);

export type DesktopApp = ElectronApplication & {
    /** The next page the app opens in the system browser (the sign-in or sign-out page), as a new tab of it. */
    waitForSystemBrowserPage(): Promise<Page>;
};

/** What the app opened with shell.openExternal, in its main process (see launchDesktopApp). */
type SystemBrowserUrls = { systemBrowserUrls: string[] };

/**
 * The desktop app, unpackaged (a packaged build's fuses turn off the --inspect Playwright needs), opening `url`.
 * Nothing it opens with shell.openExternal reaches the real browser: waitForSystemBrowserPage opens it in
 * `systemBrowser` instead, in one context for the app's lifetime, which keeps the identity provider's session from
 * sign-in to sign-out like the user's own browser.
 */
export async function launchDesktopApp(url: string, systemBrowser?: Browser): Promise<DesktopApp> {
    // Its own settings, logins, logs and single-instance lock, in the test's output folder. HOME too: the
    // app registers itself as the workadventure:// handler, which writes to the user's desktop files.
    const home = test.info().outputPath("desktop-home");
    const env = Object.fromEntries(
        Object.entries(process.env).filter(
            (entry): entry is [string, string] => entry[1] !== undefined && entry[0] !== "WAYLAND_DISPLAY",
        ),
    );
    const app = await electron.launch({
        executablePath: createRequire(path.join(desktopDir, "package.json"))("electron") as string,
        args: [
            // Playwright adds its loader only when it finds Electron itself, which it cannot from here.
            "-r",
            path.join(path.dirname(require.resolve("playwright-core/package.json")), "lib/server/electron/loader.js"),
            path.join(desktopDir, "dist/main.js"),
            "--ozone-platform=x11",
            // No GPU under xvfb: WebGL from SwiftShader.
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            "workadventure://join?url=" + encodeURIComponent(url),
        ],
        cwd: desktopDir,
        env: {
            ...env,
            NODE_ENV: "development",
            HOME: home,
            XDG_CONFIG_HOME: path.join(home, ".config"),
            // The tests expect English; on Linux, Chromium takes the language from these, not --lang.
            LANG: "en_US.UTF-8",
            LANGUAGE: "en_US",
            // Under Wayland the app restarts itself in X11 mode, which Playwright cannot follow.
            XDG_SESSION_TYPE: "x11",
            // Keeps the tray icon and the shortcut portal off the desktop session.
            DBUS_SESSION_BUS_ADDRESS: "unix:path=/nonexistent",
        },
    });
    await app.evaluate(({ shell }) => {
        const opened: string[] = [];
        Object.assign(globalThis, { systemBrowserUrls: opened } satisfies SystemBrowserUrls);
        shell.openExternal = (url: string) => {
            opened.push(url);
            return Promise.resolve();
        };
    });
    const browserContext = await systemBrowser?.newContext();
    return Object.assign(app, {
        // `await using`: the browser goes with the app, before the next test starts.
        async [Symbol.asyncDispose]() {
            await app.close();
            await browserContext?.close();
        },
        async waitForSystemBrowserPage(): Promise<Page> {
            if (!browserContext) {
                throw new Error("No system browser: pass launchDesktopApp a browser");
            }
            let opened = "";
            await expect(async () => {
                opened = await app.evaluate(
                    () => (globalThis as unknown as SystemBrowserUrls).systemBrowserUrls.shift() ?? "",
                );
                expect(opened, "a page opened in the system browser").not.toBe("");
            }).toPass({ timeout: 30_000 });
            const page = await browserContext.newPage();
            await page.goto(opened);
            return page;
        },
    });
}

/** The world tab: a WebContentsView of the main window, which Playwright lists like any page. */
export async function getWorldPage(app: ElectronApplication): Promise<Page> {
    const isWorld = (page: Page) => page.url().startsWith(play_url);
    await expect.poll(() => app.windows().some(isWorld), { timeout: 30_000 }).toBe(true);
    const page = app.windows().find(isWorld);
    if (!page) {
        throw new Error("No world page");
    }
    return page;
}

/** The mini window is a window.open of the world page, named wa-mini-window (desktop child-windows.ts). */
export async function findMiniWindow(app: ElectronApplication): Promise<Page | undefined> {
    for (const page of app.windows()) {
        // A window closing meanwhile is not the mini window any more.
        const name = await page.evaluate(() => window.name).catch(() => undefined);
        if (name === "wa-mini-window") {
            return page;
        }
    }
    return undefined;
}

export async function getMiniWindow(app: ElectronApplication): Promise<Page> {
    const page = await findMiniWindow(app);
    if (!page) {
        throw new Error("No mini window");
    }
    return page;
}

export async function isMiniWindowShown(app: ElectronApplication): Promise<boolean> {
    const page = await findMiniWindow(app);
    return page ? (await app.browserWindow(page)).evaluate((window) => window.isVisible()) : false;
}
