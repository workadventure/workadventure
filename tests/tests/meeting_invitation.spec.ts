import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import { publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import chatUtils from "./utils/chat";

test.describe("Meeting invitation @nomobile", () => {
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

        await expect(alice.locator("#cameras-container").getByText("You")).toBeVisible({ timeout: 30_000 });
        await expect(alice.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 15_000 });
        await expect(bob.locator("#cameras-container").getByText("You")).toBeVisible({ timeout: 30_000 });
        await expect(bob.locator("#cameras-container").getByText("Alice")).toBeVisible({ timeout: 15_000 });

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
});
