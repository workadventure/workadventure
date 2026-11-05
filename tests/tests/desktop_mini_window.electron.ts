import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import type { ElectronApplication, Page } from "@playwright/test";
import { _electron as electron, expect, test } from "@playwright/test";
import { play_url, publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import Map from "./utils/map";
import { expectWebRtcConnectionsCountToBe } from "./utils/webRtc";

// `npm run test-electron`, under xvfb-run on Linux. Needs `npm ci && npm run build` in desktop/electron.
const desktopDir = fileURLToPath(new URL("../../desktop/electron/", import.meta.url));
const require = createRequire(import.meta.url);

/** The desktop app, unpackaged (a packaged build's fuses turn off the --inspect Playwright needs), opening `url`. */
function launchDesktopApp(url: string): Promise<ElectronApplication> {
    // Its own settings, logins, logs and single-instance lock, in the test's output folder. HOME too: the
    // app registers itself as the workadventure:// handler, which writes to the user's desktop files.
    const home = test.info().outputPath("desktop-home");
    const env = Object.fromEntries(
        Object.entries(process.env).filter(
            (entry): entry is [string, string] => entry[1] !== undefined && entry[0] !== "WAYLAND_DISPLAY",
        ),
    );
    return electron.launch({
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
}

/** The world tab: a WebContentsView of the main window, which Playwright lists like any page. */
async function worldPage(app: ElectronApplication): Promise<Page> {
    const isWorld = (page: Page) => page.url().startsWith(play_url);
    await expect.poll(() => app.windows().some(isWorld), { timeout: 30_000 }).toBe(true);
    const page = app.windows().find(isWorld);
    if (!page) {
        throw new Error("No world page");
    }
    return page;
}

async function logIn(page: Page, name: string): Promise<void> {
    await page.getByTestId("loginSceneNameInput").fill(name);
    await page.getByTestId("loginSceneNameInput").press("Enter");
    await page.locator("button.selectCharacterSceneFormSubmit").click();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByTestId("microphone-button")).toBeVisible({ timeout: 60_000 });
}

/** The mini window is a window.open of the world page, named wa-mini-window (desktop child-windows.ts). */
async function isMiniWindowShown(app: ElectronApplication): Promise<boolean> {
    for (const page of app.windows()) {
        if ((await page.evaluate(() => window.name)) === "wa-mini-window") {
            return (await app.browserWindow(page)).evaluate((window) => window.isVisible());
        }
    }
    return false;
}

test("the mini window opens while WA is hidden and closes once the bubble ends", async ({ browser }) => {
    const url = publicTestMapUrl("tests/E2E/empty.json", "desktop_mini_window");
    await using app = await launchDesktopApp(url);
    const alice = await worldPage(app);
    await logIn(alice, "Alice");
    await Map.teleportToPosition(alice, 4 * 32, 4 * 32);

    await using bob = await getPage(browser, "Bob", url);
    await Map.teleportToPosition(bob, 4 * 32 + 16, 4 * 32);
    await expectWebRtcConnectionsCountToBe(alice, 1, 30_000);
    expect(await isMiniWindowShown(app)).toBe(false);

    // WA hidden. Not minimized: minimize() does nothing without a window manager, as under xvfb. Like a
    // minimized page, the world page then gets no animation frames (though it still says it is visible).
    await (await app.browserWindow(alice)).evaluate((window) => window.hide());
    await expect.poll(() => isMiniWindowShown(app)).toBe(true);
    const gotFrame = alice.evaluate(
        () =>
            new Promise<boolean>((resolve) => {
                requestAnimationFrame(() => resolve(true));
                setTimeout(() => resolve(false), 1000);
            }),
    );
    expect(await gotFrame).toBe(false);

    // Bob leaves: the bubble ends while WA is still hidden.
    await Map.teleportToPosition(bob, 0, 0);
    await expect.poll(() => isMiniWindowShown(app)).toBe(false);
});
