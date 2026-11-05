import { expect, test } from "@playwright/test";
import { publicTestMapUrl } from "./utils/urls";
import { getPage, logIn } from "./utils/auth";
import Map from "./utils/map";
import { expectWebRtcConnectionsCountToBe } from "./utils/webRtc";
import { getWorldPage, isMiniWindowShown, launchDesktopApp } from "./utils/desktop";

test("the mini window opens while WA is hidden and closes once the bubble ends", async ({ browser }) => {
    const url = publicTestMapUrl("tests/E2E/empty.json", "desktop_mini_window");
    await using app = await launchDesktopApp(url);
    const alice = await getWorldPage(app);
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
