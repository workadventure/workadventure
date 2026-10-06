// @ts-check
const { test: base, expect, _electron: electron } = require("@playwright/test");
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

// The packaged app in CI; locally, Electron from node_modules running the built dist/main.js.
const EXECUTABLE = process.env.WA_E2E_EXECUTABLE && path.resolve(process.env.WA_E2E_EXECUTABLE);

/**
 * A stand-in world: the shell treats any page under /_/ as a world. It reports its presence the way
 * the real front does, which is what the reach-the-world watchdog and the companion listen to.
 */
const WORLD_PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><title>E2E world</title></head><body><script>
    window.presence = { inWorld: true, inMeeting: false };
    window.WAD.setPresence(window.presence);
    window.WAD.onRequestPresence?.(() => window.WAD.setPresence(window.presence));
</script></body></html>`;

const test = base.extend({
    worlds: async ({}, use) => {
        const server = http.createServer((request, response) => {
            response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            response.end(WORLD_PAGE);
        });
        await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(undefined)));
        const address = server.address();
        const origin = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
        await use({ origin, url: (/** @type {string} */ name) => `${origin}/_/e2e/${name}` });
        server.close();
    },

    launch: async ({ worlds }, use, testInfo) => {
        /** @type {{ app: import("@playwright/test").ElectronApplication, output: string[] }[]} */
        const launched = [];

        /**
         * @param {{ deepLink?: string, env?: Record<string, string>, args?: string[], settings?: object }} [options]
         */
        const launch = async (options = {}) => {
            const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wa-desktop-e2e-"));
            if (options.settings) {
                // electron-settings' file, merged over the defaults at startup.
                fs.writeFileSync(path.join(userDataDir, "settings.json"), JSON.stringify(options.settings));
            }
            const env = {
                ...process.env,
                // The stand-in worlds are trusted like a world the portal vouched for.
                WA_DESKTOP_ALLOWED_ORIGINS: worlds.origin,
                // CI's Linux display is X11 (xvfb); a test sets Wayland explicitly.
                ...(process.platform === "linux" ? { XDG_SESSION_TYPE: "x11" } : {}),
                ...options.env,
            };
            const args = [
                ...(EXECUTABLE ? [] : [path.join(__dirname, "..", "dist", "main.js")]),
                `--user-data-dir=${userDataDir}`,
                ...(options.args ?? []),
            ];
            const app = await electron.launch({
                ...(EXECUTABLE ? { executablePath: EXECUTABLE } : {}),
                args: [...args, ...(options.deepLink ? [deepLinkTo(options.deepLink)] : [])],
                env,
            });
            const output = [];
            app.process().stdout?.on("data", (chunk) => output.push(String(chunk)));
            app.process().stderr?.on("data", (chunk) => output.push(String(chunk)));
            launched.push({ app, output });

            /**
             * Open a link the way the OS does while the app runs: a second instance with the same
             * profile hands it over to the running one, then quits.
             * @param {string} url
             */
            const openDeepLink = (url) =>
                new Promise((resolve, reject) => {
                    const binary = EXECUTABLE ?? /** @type {string} */ (/** @type {unknown} */ (require("electron")));
                    const second = spawn(binary, [...args, deepLinkTo(url)], { env, stdio: "ignore" });
                    const timer = setTimeout(() => reject(new Error("The second instance did not quit")), 20_000);
                    second.on("exit", () => {
                        clearTimeout(timer);
                        resolve(undefined);
                    });
                });

            return { app, output, openDeepLink };
        };

        await use(launch);

        for (const { app, output } of launched) {
            if (testInfo.status !== testInfo.expectedStatus) {
                await testInfo.attach("app output", { body: output.join(""), contentType: "text/plain" });
                for (const [index, page] of app.windows().entries()) {
                    const screenshot = await page.screenshot().catch(() => undefined);
                    if (screenshot) {
                        await testInfo.attach(`window ${index} (${page.url()})`, {
                            body: screenshot,
                            contentType: "image/png",
                        });
                    }
                }
            }
            await app.close().catch(() => {});
        }
    },
});

/** @param {string} url */
function deepLinkTo(url) {
    return `workadventure://join?url=${encodeURIComponent(url)}`;
}

// Everything below goes through the main process: world tabs are WebContentsViews, and HUD windows
// open and close on their own, so it is the one place that sees them all.

/**
 * URLs of the world tabs currently open.
 * @param {import("@playwright/test").ElectronApplication} app
 * @param {{ origin: string }} worlds
 */
function worldTabs(app, worlds) {
    return app.evaluate(
        ({ webContents }, origin) =>
            webContents
                .getAllWebContents()
                .map((contents) => contents.getURL())
                .filter((url) => url.startsWith(origin)),
        worlds.origin
    );
}

/**
 * @param {import("@playwright/test").ElectronApplication} app
 * @param {string} url
 * @param {string} code
 */
function inWorld(app, url, code) {
    return app.evaluate(
        ({ webContents }, [url, code]) => {
            const contents = webContents.getAllWebContents().find((candidate) => candidate.getURL().startsWith(url));
            if (!contents) {
                throw new Error(`No tab shows ${url}`);
            }
            return contents.executeJavaScript(code);
        },
        [url, code]
    );
}

/**
 * @param {import("@playwright/test").ElectronApplication} app
 * @param {string} url
 * @param {boolean} inMeeting
 */
function setInMeeting(app, url, inMeeting) {
    return inWorld(app, url, `window.presence.inMeeting = ${inMeeting}; window.WAD.setPresence(window.presence);`);
}

/**
 * Take WorkAdventure out of view (as when it gets covered or minimized), or bring it back.
 * @param {import("@playwright/test").ElectronApplication} app
 * @param {string} url
 * @param {boolean} visible
 */
function setMainWindowVisible(app, url, visible) {
    return app.evaluate(
        ({ BrowserWindow }, [url, visible]) => {
            const window = BrowserWindow.getAllWindows().find((candidate) =>
                candidate.contentView.children.some(
                    (view) => "webContents" in view && view.webContents.getURL().startsWith(url)
                )
            );
            if (!window) {
                throw new Error(`No window shows ${url}`);
            }
            if (visible) {
                window.show();
            } else {
                window.hide();
            }
        },
        [url, visible]
    );
}

/** @param {import("@playwright/test").ElectronApplication} app */
function companionShown(app) {
    return app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().some(
            (window) => window.webContents.getURL().includes("/companion/index.html") && window.isVisible()
        )
    );
}

const SCREEN_SHARE_API = `({
    sources: typeof window.WAD.getDesktopCapturerSources,
    identifyScreens: typeof window.WAD.identifyScreens,
    meetingBar: Boolean(window.WAD.presenterHud),
})`;

test("the first launch shows the Landing", async ({ launch }) => {
    const { app } = await launch();

    await expect
        .poll(() =>
            app.evaluate(({ webContents }) => webContents.getAllWebContents().map((contents) => contents.getURL()))
        )
        .toContainEqual(expect.stringMatching(/\/landing\/index\.html$/));
});

test("a deep link opens the world, with the screen sharing of the platform", async ({ launch, worlds }) => {
    const world = worlds.url("first");
    const { app } = await launch({ deepLink: world });

    await expect.poll(() => worldTabs(app, worlds)).toEqual([world]);
    // The in-app picker lists the sources; the floating meeting bar only exists where it can be kept
    // out of the capture (macOS, Windows).
    expect(await inWorld(app, world, SCREEN_SHARE_API)).toEqual({
        sources: "function",
        identifyScreens: "function",
        meetingBar: process.platform !== "linux",
    });
});

test("under Wayland, the system dialog picks what to share", async ({ launch, worlds }) => {
    test.skip(process.platform !== "linux", "Wayland is Linux only");
    const world = worlds.url("first");
    // xvfb has no Wayland compositor: only the session type says Wayland, the window stays on X11.
    const { app } = await launch({
        deepLink: world,
        env: { XDG_SESSION_TYPE: "wayland" },
        args: ["--ozone-platform=x11"],
    });

    await expect.poll(() => worldTabs(app, worlds)).toEqual([world]);
    expect(await inWorld(app, world, SCREEN_SHARE_API)).toEqual({
        sources: "undefined",
        identifyScreens: "undefined",
        meetingBar: false,
    });
});

test("opening a world already open switches to its tab", async ({ launch, worlds }) => {
    const world = worlds.url("first");
    const { app, output, openDeepLink } = await launch({ deepLink: world });
    await expect.poll(() => worldTabs(app, worlds)).toEqual([world]);

    await openDeepLink(world);

    await expect.poll(() => output.join("")).toContain("Switching to the tab that already shows");
    expect(await worldTabs(app, worlds)).toEqual([world]);
});

test("opening another world opens it in a second tab", async ({ launch, worlds }) => {
    const first = worlds.url("first");
    const second = worlds.url("second");
    const { app, openDeepLink } = await launch({ deepLink: first });
    await expect.poll(() => worldTabs(app, worlds)).toEqual([first]);

    await openDeepLink(second);

    await expect.poll(async () => (await worldTabs(app, worlds)).sort()).toEqual([first, second]);
});

test("with the tab bar hidden, opening another world replaces the one left", async ({ launch, worlds }) => {
    const first = worlds.url("first");
    const second = worlds.url("second");
    // No hidden tab: a world the user cannot see nor switch back to would keep running.
    const { app, openDeepLink } = await launch({ deepLink: first, settings: { tab_bar_enabled: false } });
    await expect.poll(() => worldTabs(app, worlds)).toEqual([first]);

    await openDeepLink(second);

    await expect.poll(() => worldTabs(app, worlds)).toEqual([second]);
});

test("WorkAdventure leaving the view during a meeting opens the companion", async ({ launch, worlds }) => {
    const world = worlds.url("first");
    const { app } = await launch({ deepLink: world });
    await expect.poll(() => worldTabs(app, worlds)).toEqual([world]);

    await setInMeeting(app, world, true);
    await setMainWindowVisible(app, world, false);
    await expect.poll(() => companionShown(app), { timeout: 15_000 }).toBe(true);

    // The meeting ending closes it.
    await setInMeeting(app, world, false);
    await expect.poll(() => companionShown(app)).toBe(false);
});

test("WorkAdventure leaving the view outside a meeting keeps the companion closed", async ({ launch, worlds }) => {
    const world = worlds.url("first");
    const { app } = await launch({ deepLink: world });
    await expect.poll(() => worldTabs(app, worlds)).toEqual([world]);

    await setMainWindowVisible(app, world, false);
    // Longer than the companion's opening delay.
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    expect(await companionShown(app)).toBe(false);
});
