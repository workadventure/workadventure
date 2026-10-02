import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import { publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import chatUtils from "./utils/chat";

test.describe("Meeting invitation @nomobile @nowebkit", () => {
    test.beforeEach(async ({ browserName, page }) => {
        test.skip(browserName === "webkit" || isMobile(page), "Skip on WebKit and mobile");
    });

    test("Invite user, declined, verify notification", async ({ browser }) => {
        const mapUrl = publicTestMapUrl("tests/E2E/empty.json", "meeting");
        await using alice = await getPage(browser, "Alice", mapUrl);
        await Map.teleportToPosition(alice, 160, 160);

        await using bob = await getPage(browser, "Bob", mapUrl);
        await Map.teleportToPosition(bob, 100, 100);

        // Invite user
        await chatUtils.UL_invite(alice, "Bob");

        // Accept invitation
        await chatUtils.UL_declineInvitation(bob);

        await expect(
            alice.locator(".toast-container").filter({ hasText: "Your invitation was declined by Bob" }),
        ).toBeVisible({ timeout: 10_000 });
    });

    test("Invite user, accepted, verify bubble and participant list", async ({ browser }) => {
        const mapUrl = publicTestMapUrl("tests/E2E/empty.json", "meeting");
        await using alice = await getPage(browser, "Alice", mapUrl);
        await Map.teleportToPosition(alice, 160, 160);

        await using bob = await getPage(browser, "Bob", mapUrl);
        await Map.teleportToPosition(bob, 100, 100);

        // Invite user
        await chatUtils.UL_invite(alice, "Bob");

        // Accept invitation
        await chatUtils.UL_acceptInvitation(bob);

        await expect(alice.locator("#cameras-container").getByText("You").first()).toBeVisible({ timeout: 30_000 });
        await expect(alice.locator("#cameras-container").getByText("Bob").first()).toBeVisible({ timeout: 15_000 });
        await expect(bob.locator("#cameras-container").getByText("You").first()).toBeVisible({ timeout: 30_000 });
        await expect(bob.locator("#cameras-container").getByText("Alice").first()).toBeVisible({ timeout: 15_000 });

        await alice.getByTestId("participant-menu").click();
        await expect(alice.getByTestId("participant-sub-menu")).toBeVisible({ timeout: 5_000 });
        await expect(alice.getByTestId("participant-row-me")).toBeVisible();
        await expect(alice.getByTestId("participant-row").filter({ hasText: "Bob" })).toBeVisible();

        await bob.getByTestId("participant-menu").click();
        await expect(bob.getByTestId("participant-sub-menu")).toBeVisible({ timeout: 5_000 });
        await expect(bob.getByTestId("participant-row-me")).toBeVisible();
        await expect(bob.getByTestId("participant-row").filter({ hasText: "Alice" })).toBeVisible();
    });

    test("More than 3 consecutive invitations show antispam notification", async ({ browser }) => {
        const mapUrl = publicTestMapUrl("tests/E2E/empty.json", "meeting");
        await using alice = await getPage(browser, "Alice", mapUrl);
        await Map.teleportToPosition(alice, 160, 160);

        await using bob = await getPage(browser, "Bob", mapUrl);
        await Map.teleportToPosition(bob, 100, 100);

        // Try to invite 3 times
        await chatUtils.UL_invite(alice, "Bob", 4);

        // Verify antispam notification
        await expect(
            alice.locator(".toast-container").filter({ hasText: "You have sent too many meeting invitations" }),
        ).toBeVisible({ timeout: 10_000 });
    });

    test("Invite a user on another map, accepted, they come to the sender", async ({ browser }) => {
        // Without an admin, every map of the same play server is in the same world: both users see each other
        // in the user list, under different maps.
        await using mallory = await getPage(
            browser,
            "Mallory",
            publicTestMapUrl("tests/E2E/empty.json", "meeting_map_a"),
        );
        await Map.teleportToPosition(mallory, 160, 160);
        await using john = await getPage(browser, "John", publicTestMapUrl("tests/E2E/empty.json", "meeting_map_b"));

        await chatUtils.UL_inviteOnOtherMap(mallory, "John");
        await chatUtils.UL_acceptInvitation(john);

        await expect(
            mallory.locator(".toast-container").filter({ hasText: "Your invitation was accepted by John" }),
        ).toBeVisible({ timeout: 10_000 });
        // John is taken to Mallory's map and walks to her
        await expect(john).toHaveURL(/meeting_map_a/, { timeout: 30_000 });
        await expect(john.locator("#cameras-container").getByText("Mallory").first()).toBeVisible({
            timeout: 30_000,
        });
    });

    test("Invite a user on another map, declined, verify notification", async ({ browser }) => {
        await using mallory = await getPage(
            browser,
            "Mallory",
            publicTestMapUrl("tests/E2E/empty.json", "meeting_map_c"),
        );
        await using john = await getPage(browser, "John", publicTestMapUrl("tests/E2E/empty.json", "meeting_map_d"));

        await chatUtils.UL_inviteOnOtherMap(mallory, "John");
        await chatUtils.UL_declineInvitation(john);

        await expect(
            mallory.locator(".toast-container").filter({ hasText: "Your invitation was declined by John" }),
        ).toBeVisible({ timeout: 10_000 });
        await expect(john).toHaveURL(/meeting_map_d/);
    });
});
