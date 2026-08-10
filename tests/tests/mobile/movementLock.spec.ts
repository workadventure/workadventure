import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import Map from "../utils/map";
import { getPage } from "../utils/auth";
import { isMobile } from "../utils/isMobile";
import { gameToBrowserCoordinates } from "../utils/gameCoordinates";

test.setTimeout(120_000);

// A walkable tile on the "empty" map (same area used by mobile.spec.ts).
const SPAWN = { x: 96, y: 128 };
// Horizontal offset (in game pixels) of the tap target from the avatar. Kept small so the
// point stays on-screen at the mobile camera zoom, while still being clearly walkable.
const TAP_OFFSET = 64;
// Distance thresholds (game pixels). These may need a small tune on the first CI run.
const MOVED_THRESHOLD = 8; // clearly moved
const STILL_EPSILON = 2; // effectively did not move
const POST_TELEPORT_TOLERANCE = 8; // teleport lands close to the target

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Tap on the game canvas at a game-space position to trigger tap-to-move.
 * A touch tap is required (not page.mouse.click): tap-to-move ignores a plain left mouse click,
 * and — crucially — the movement lock only blocks user input, NOT the scripting API
 * (WA.player.moveTo/teleport), so the test must exercise a real gesture.
 */
async function tapGame(page: Page, x: number, y: number): Promise<void> {
    const browser = await gameToBrowserCoordinates(page, { x, y });
    await page.touchscreen.tap(browser.x, browser.y);
}

test.describe("Movement lock @nowebkit @nodesktop", () => {
    test.beforeEach(async ({ page, browserName }) => {
        test.skip(!isMobile(page) || browserName === "webkit", "Run only on mobile non-webkit");
    });

    test("locking blocks tap-to-move, unlocking restores it", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", Map.url("empty"));

        // The lock button lives in the always-visible bottom-right zoom/explorer cluster.
        const lockButton = page.getByTestId("movement-lock-button");
        await expect(lockButton).toBeVisible();

        // --- Baseline: while unlocked, a tap moves the avatar ---
        // Teleport is a scripting move, never blocked by the lock — good for setup.
        await Map.teleportToPosition(page, SPAWN.x, SPAWN.y);
        await expect
            .poll(async () => distance(await Map.getPosition(page), SPAWN))
            .toBeLessThan(POST_TELEPORT_TOLERANCE);

        const start = await Map.getPosition(page);
        await tapGame(page, start.x + TAP_OFFSET, start.y);
        await expect
            .poll(async () => distance(await Map.getPosition(page), start), { timeout: 10_000 })
            .toBeGreaterThan(MOVED_THRESHOLD);

        // --- Locked: a tap does NOT move the avatar ---
        await lockButton.click();
        await Map.teleportToPosition(page, SPAWN.x, SPAWN.y); // back to a known spot (scripting still works)
        await expect
            .poll(async () => distance(await Map.getPosition(page), SPAWN))
            .toBeLessThan(POST_TELEPORT_TOLERANCE);

        const locked = await Map.getPosition(page);
        await tapGame(page, locked.x + TAP_OFFSET, locked.y);
        // Poll up to 2s for any movement and expect it to NEVER happen: the poll should time out
        // (there is no positive event to await when movement is correctly blocked).
        let movedWhileLocked = true;
        try {
            await expect
                .poll(async () => distance(await Map.getPosition(page), locked), { timeout: 2_000 })
                .toBeGreaterThan(STILL_EPSILON);
        } catch {
            movedWhileLocked = false;
        }
        expect(movedWhileLocked, "the avatar must not move while movement is locked").toBe(false);

        // --- Unlocked again: movement is restored ---
        await lockButton.click();
        await tapGame(page, locked.x + TAP_OFFSET, locked.y);
        await expect
            .poll(async () => distance(await Map.getPosition(page), locked), { timeout: 10_000 })
            .toBeGreaterThan(MOVED_THRESHOLD);
    });
});
