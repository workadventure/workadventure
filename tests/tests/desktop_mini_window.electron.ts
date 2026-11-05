import { expect, test } from "@playwright/test";
import { publicTestMapUrl } from "./utils/urls";
import { getPage, logIn } from "./utils/auth";
import Map from "./utils/map";
import { expectWebRtcConnectionsCountToBe } from "./utils/webRtc";
import { getMiniWindow, getWorldPage, isMiniWindowShown, launchDesktopApp } from "./utils/desktop";

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

test("a mini window opened by hand stays once the bubble ends", async ({ browser }) => {
    const url = publicTestMapUrl("tests/E2E/empty.json", "desktop_mini_window");
    await using app = await launchDesktopApp(url);
    const alice = await getWorldPage(app);
    await logIn(alice, "Alice");
    await Map.teleportToPosition(alice, 4 * 32, 4 * 32);

    // Opened by hand, as from the profile menu.
    await alice.evaluate(() => window.WAD?.windows?.openMiniWindow());
    await expect.poll(() => isMiniWindowShown(app)).toBe(true);
    // Then the user goes to work in another app.
    await (await app.browserWindow(alice)).evaluate((window) => window.hide());

    await using bob = await getPage(browser, "Bob", url);
    await Map.teleportToPosition(bob, 4 * 32 + 16, 4 * 32);
    await expectWebRtcConnectionsCountToBe(alice, 1, 30_000);

    await Map.teleportToPosition(bob, 0, 0);
    await expectWebRtcConnectionsCountToBe(alice, 0, 30_000);
    // Give a wrong close time to happen: leaving a bubble is reported within about 250 ms.
    await alice.waitForTimeout(2000);
    expect(await isMiniWindowShown(app)).toBe(true);
});

test("a visitor shown in the mini window does not end away mode; one click does", async ({ browser }) => {
    const url = publicTestMapUrl("tests/E2E/empty.json", "desktop_mini_window");
    await using app = await launchDesktopApp(url);
    const alice = await getWorldPage(app);
    await logIn(alice, "Alice");
    await Map.teleportToPosition(alice, 4 * 32, 4 * 32);
    // Alice goes to work in another app before anyone comes: away mode. Without a window manager (xvfb), hiding
    // the window does not take the focus from the page: blur it ourselves.
    await (await app.browserWindow(alice)).evaluate((window) => window.hide());
    await alice.evaluate(() => window.dispatchEvent(new Event("blur")));

    await using bob = await getPage(browser, "Bob", url);
    await Map.teleportToPosition(bob, 4 * 32 + 16, 4 * 32);
    await expect.poll(() => isMiniWindowShown(app)).toBe(true);
    const miniWindow = await getMiniWindow(app);

    // Default away settings: the camera is held off, the microphone kept.
    const shutter = miniWindow.getByTestId("away-paused-overlay");
    await expect(shutter).toBeVisible();
    await expect(miniWindow.locator('.toolbar-btn[data-state="paused"]')).toHaveCount(1);

    await miniWindow.getByTestId("away-paused-turn-on").click();
    await expect(shutter).toBeHidden();
    await expect(miniWindow.locator('.toolbar-btn[data-state="paused"]')).toHaveCount(0);
});
