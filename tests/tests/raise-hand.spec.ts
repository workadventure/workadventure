import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import { publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";

// These tests exercise the raise-hand feature in a proximity meeting (ALL_USERS), where every participant
// can see every other one. The raise-hand state travels through the space metadata queue, so this also
// covers that pipeline end to end (badge ordering + give-the-floor).
//
// The megaphone/webinar case (a speaker without seeAttendees seeing the queue and giving the floor through
// the host panel) is covered in raise-hand-megaphone.spec.ts.
test.describe("Raise hand @nomobile @nowebkit", () => {
    test.beforeEach(({ browserName, page }) => {
        // WebKit has camera issues in CI and the feature is not exercised on mobile.
        test.skip(browserName === "webkit" || isMobile(page), "WebKit has camera issues; not run on mobile");
    });

    test("a raised hand shows an ordered badge to others, and giving the floor lowers it @nofirefox", async ({
        browser,
    }) => {
        // Sometimes, in Firefox, the WebRTC connection cannot be established and this causes this test to fail.
        test.skip(browser.browserType().name() === "firefox", "WebRTC connection is sometimes flaky on Firefox");

        await using alice = await getPage(browser, "Alice", publicTestMapUrl("tests/E2E/empty.json", "raisehand"));
        await Map.teleportToPosition(alice, 160, 160);
        await using bob = await getPage(browser, "Bob", publicTestMapUrl("tests/E2E/empty.json", "raisehand"));
        await Map.teleportToPosition(bob, 160, 160);

        // Wait for the proximity meeting to be established (Alice sees Bob's camera box).
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
    }) => {
        test.skip(browser.browserType().name() === "firefox", "WebRTC connection is sometimes flaky on Firefox");

        await using alice = await getPage(
            browser,
            "Alice",
            publicTestMapUrl("tests/E2E/empty.json", "raisehand-order"),
        );
        await Map.teleportToPosition(alice, 160, 160);
        await using bob = await getPage(browser, "Bob", publicTestMapUrl("tests/E2E/empty.json", "raisehand-order"));
        await Map.teleportToPosition(bob, 160, 160);
        await using eve = await getPage(browser, "Eve", publicTestMapUrl("tests/E2E/empty.json", "raisehand-order"));
        await Map.teleportToPosition(eve, 160, 160);

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
});
