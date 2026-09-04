import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import AreaEditor from "./utils/map-editor/areaEditor";
import { resetWamMaps } from "./utils/map-editor/uploader";
import MapEditor from "./utils/mapeditor";
import Menu from "./utils/menu";
import { map_storage_url } from "./utils/urls";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";

test.setTimeout(240_000); // Map editor + LiveKit can be slow.
test.use({
    baseURL: map_storage_url,
});

// These tests exercise the raise-hand feature in a LiveKit meeting area, one of the two zones that offer it
// (the other being a megaphone audience, covered in raise-hand-megaphone.spec.ts). The raise-hand state
// travels through the space metadata queue, so this also covers that pipeline end to end (badge ordering +
// give-the-floor).
//
// A proximity bubble offers the control too, without any promotion: the raised hands form an ordered queue
// every participant sees, so whoever leads the discussion can give the floor orally ("give the floor" there
// only lowers the hand). The meeting area can turn the control off; both are asserted below.
test.describe("Raise hand @oidc @nomobile @nowebkit", () => {
    test.beforeEach(({ browserName, page }) => {
        // Map editor is unavailable on mobile, and WebKit has camera issues in CI.
        test.skip(browserName === "webkit" || isMobile(page), "Map editor unavailable on mobile; WebKit camera issues");
    });

    /** Draws a meeting area over the top of the empty map and returns to the game. */
    async function createMeetingArea(page: Page, raiseHandEnabled = true) {
        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, { x: 1 * 32, y: 2 * 32 }, { x: 9 * 32, y: 5 * 32 });
        await AreaEditor.setAreaLiveKitProperty(page, false, false, raiseHandEnabled);
        await Menu.closeMapEditor(page);
    }

    test("in a proximity bubble everyone sees the queue and can give the floor, which only lowers the hand @nofirefox", async ({
        browser,
        request,
    }) => {
        test.skip(browser.browserType().name() === "firefox", "WebRTC connection is sometimes flaky on Firefox");
        await resetWamMaps(request);

        // Two non-admin users meeting outside any area form a bubble: nobody is a host, so the raised hands
        // are a plain ordered queue shown to both of them.
        await using alice = await getPage(browser, "Alice", Map.url("empty"));
        await Map.teleportToPosition(alice, 5 * 32, 12 * 32);
        await using bob = await getPage(browser, "Bob", Map.url("empty"));
        await Map.teleportToPosition(bob, 5 * 32, 12 * 32);

        // The bubble is established (Alice sees Bob's camera box)...
        await expect(alice.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 30_000 });

        // ...and both of them have the raise-hand button.
        await expect(alice.getByTestId("raise-hand-button")).toBeVisible();
        await expect(bob.getByTestId("raise-hand-button")).toBeVisible();

        // Bob raises his hand: Alice, a plain participant, gets the queue with Bob in it.
        await bob.getByTestId("raise-hand-button").click();
        const dock = alice.getByTestId("raised-hands-dock");
        await expect(dock).toBeVisible({ timeout: 20_000 });
        await expect(dock.getByTestId("raised-hands-panel")).toContainText("Bob");

        // Alice gives Bob the floor from the queue: nothing to promote in a bubble, Bob is just told it is his
        // turn and his hand goes down, which empties (and hides) the queue.
        await dock.getByTestId("panel-give-floor").click();
        await expect(bob.getByText(/It's your turn to speak/)).toBeVisible({ timeout: 20_000 });
        await expect(dock).toBeHidden({ timeout: 20_000 });
    });

    test("a raised hand shows an ordered badge to others, and giving the floor lowers it @nofirefox", async ({
        browser,
        request,
    }) => {
        // Sometimes, in Firefox, the WebRTC connection cannot be established and this causes this test to fail.
        test.skip(browser.browserType().name() === "firefox", "WebRTC connection is sometimes flaky on Firefox");

        await resetWamMaps(request);

        await using alice = await getPage(browser, "Admin1", Map.url("empty"));
        await createMeetingArea(alice);

        await Map.teleportToPosition(alice, 3 * 32, 3 * 32);
        await using bob = await getPage(browser, "Bob", Map.url("empty"));
        await Map.teleportToPosition(bob, 7 * 32, 3 * 32);

        // Wait for the meeting to be established (Alice sees Bob's camera box).
        await expect(alice.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 30_000 });

        const bobBoxOnAlice = alice.locator("#cameras-container .camera-box").filter({ hasText: "Bob" });

        // Bob raises his hand.
        await bob.getByTestId("raise-hand-button").click();

        // Alice sees Bob's raised-hand badge, numbered 1 (first in the queue).
        await expect(bobBoxOnAlice.getByTestId("raised-hand-badge")).toBeVisible({ timeout: 20_000 });
        await expect(bobBoxOnAlice.getByTestId("raised-hand-badge")).toContainText("1");

        // Alice opens Bob's tile menu and gives him the floor.
        await bobBoxOnAlice.locator(".user-menu-btn").click();
        await alice.getByTestId("give-floor-user").click();

        // Bob is notified that it is his turn, and his raised hand is lowered (the badge disappears for Alice).
        await expect(bob.getByText(/It's your turn to speak/)).toBeVisible({ timeout: 20_000 });
        await expect(bobBoxOnAlice.getByTestId("raised-hand-badge")).toBeHidden({ timeout: 20_000 });
    });

    test("raised hands are numbered in the order they were raised, and re-numbered when one is lowered @nofirefox", async ({
        browser,
        request,
    }) => {
        test.skip(browser.browserType().name() === "firefox", "WebRTC connection is sometimes flaky on Firefox");

        await resetWamMaps(request);

        await using alice = await getPage(browser, "Admin1", Map.url("empty"));
        await createMeetingArea(alice);

        await Map.teleportToPosition(alice, 2 * 32, 3 * 32);
        await using bob = await getPage(browser, "Bob", Map.url("empty"));
        await Map.teleportToPosition(bob, 5 * 32, 3 * 32);
        await using eve = await getPage(browser, "Eve", Map.url("empty"));
        await Map.teleportToPosition(eve, 8 * 32, 3 * 32);

        // Wait until Alice sees both other participants.
        await expect(alice.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 30_000 });
        await expect(alice.locator("#cameras-container").getByText("Eve")).toBeVisible({ timeout: 30_000 });

        const bobBox = alice.locator("#cameras-container .camera-box").filter({ hasText: "Bob" });
        const eveBox = alice.locator("#cameras-container .camera-box").filter({ hasText: "Eve" });

        // Bob raises first -> position 1.
        await bob.getByTestId("raise-hand-button").click();
        await expect(bobBox.getByTestId("raised-hand-badge")).toContainText("1", { timeout: 20_000 });

        // Eve raises second -> position 2.
        await eve.getByTestId("raise-hand-button").click();
        await expect(eveBox.getByTestId("raised-hand-badge")).toContainText("2", { timeout: 20_000 });

        // Bob lowers his hand -> Eve moves up to position 1.
        await bob.getByTestId("raise-hand-button").click();
        await expect(bobBox.getByTestId("raised-hand-badge")).toBeHidden({ timeout: 20_000 });
        await expect(eveBox.getByTestId("raised-hand-badge")).toContainText("1", { timeout: 20_000 });
    });

    test("a meeting area with the raise-hand option turned off offers no control @nofirefox", async ({
        browser,
        request,
    }) => {
        test.skip(browser.browserType().name() === "firefox", "WebRTC connection is sometimes flaky on Firefox");

        await resetWamMaps(request);

        await using alice = await getPage(browser, "Admin1", Map.url("empty"));
        await createMeetingArea(alice, false);

        await Map.teleportToPosition(alice, 3 * 32, 3 * 32);
        await using bob = await getPage(browser, "Bob", Map.url("empty"));
        await Map.teleportToPosition(bob, 7 * 32, 3 * 32);

        // The meeting is established...
        await expect(alice.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 30_000 });

        // ...but the option is off, so nobody gets the button.
        await expect(bob.getByTestId("raise-hand-button")).toBeHidden();
        await expect(alice.getByTestId("raise-hand-button")).toBeHidden();
    });
});
