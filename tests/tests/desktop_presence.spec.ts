import { expect, test } from "@playwright/test";
import { publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import Map from "./utils/map";
import { isMobile } from "./utils/isMobile";

type Presence = { inMeeting: boolean; withOthers: boolean };

test.describe("Presence reported to the desktop app @nomobile", () => {
    test.beforeEach(({ page }) => {
        test.skip(isMobile(page), "The desktop app is not on mobile");
    });

    // The desktop app's mini window opens while WA is minimized, which is when the page gets no
    // animation frames: the end of the bubble must still reach the app, or the window stays open.
    test("the end of a bubble is reported while the page gets no frames", async ({ browser }) => {
        const url = publicTestMapUrl("tests/E2E/empty.json", "desktop_presence");
        await using alice = await getPage(browser, "Alice", url, {
            pageCreatedHook: async (page) => {
                // A desktop app that records what the page reports.
                await page.addInitScript(() => {
                    const reports: Presence[] = [];
                    (window as unknown as { presenceReports: Presence[] }).presenceReports = reports;
                    (window as unknown as { WAD: unknown }).WAD = {
                        desktop: true,
                        getVersion: () => Promise.resolve("1.0.0"),
                        onMuteToggle: () => {},
                        onCameraToggle: () => {},
                        setPresence: (presence: Presence) => reports.push(presence),
                    };
                });
            },
        });
        const lastReport = () =>
            alice.evaluate(() => (window as unknown as { presenceReports: Presence[] }).presenceReports.at(-1));

        await Map.teleportToPosition(alice, 4 * 32, 4 * 32);
        await using bob = await getPage(browser, "Bob", url);
        await Map.teleportToPosition(bob, 4 * 32 + 16, 4 * 32);
        await expect.poll(lastReport, { timeout: 20_000 }).toMatchObject({ inMeeting: true, withOthers: true });

        // WA gets minimized: no more animation frames, so Phaser's update() stops.
        await alice.evaluate(() => {
            window.requestAnimationFrame = () => 0;
        });

        await Map.teleportToPosition(bob, 0, 0);
        await expect.poll(lastReport, { timeout: 10_000 }).toMatchObject({ inMeeting: false, withOthers: false });
    });
});
