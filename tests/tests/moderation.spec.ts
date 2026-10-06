import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import chatUtils from "./utils/chat";
import Map from "./utils/map";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import { publicTestMapUrl } from "./utils/urls";

const mapUrl = () => publicTestMapUrl("tests/E2E/empty.json", "moderation");

/** Opens the chat user list, then the moderation modal on `nickname`. */
async function openModerationModal(page: Page, nickname: string) {
    await chatUtils.openUserList(page, false);
    const user = page.locator(".user", { hasText: nickname });
    await user.locator(".wa-dropdown button").click();
    await user.getByText("Moderate").click();
    await expect(page.getByTestId("blockmenu-block-user-button")).toBeVisible();
}

/** In a conversation, opens the moderation modal from the menu of `nickname`'s video. */
async function openModerationModalFromVideo(page: Page, nickname: string) {
    const box = page.locator("#cameras-container .camera-box").filter({ hasText: nickname });
    await box.locator(".user-menu-btn").click();
    await page.getByRole("button", { name: "Moderation", exact: true }).click();
    await expect(page.getByTestId("blockmenu-block-user-button")).toBeVisible();
}

// The chat user list is not tested on WebKit (see userlist.spec.ts).
test.describe("In-game moderation @oidc @nomobile @nowebkit", () => {
    test.beforeEach(({ page, browserName }) => {
        test.skip(isMobile(page) || browserName === "webkit", "Skip on mobile and WebKit");
    });

    test("only an admin can kick, and nobody can ban without an admin API", async ({ browser }) => {
        await using admin = await getPage(browser, "Admin1", mapUrl());
        await using alice = await getPage(browser, "Alice", mapUrl());

        // A user who is not admin can only block or report.
        await openModerationModal(alice, "Admin1");
        await expect(alice.getByTestId("moderation-kick-action")).toBeHidden();
        await expect(alice.getByTestId("moderation-ban-action")).toBeHidden();

        // No admin API advertises api/ban: the admin can kick but not ban.
        await openModerationModal(admin, "Alice");
        await expect(admin.getByTestId("moderation-ban-action")).toBeHidden();

        await admin.getByTestId("moderation-kick-action").click();
        await admin.getByTestId("moderation-text").fill("Too loud");
        await admin.getByTestId("moderation-submit").click();

        const errorScreen = alice.locator(".errorScreen");
        await expect(errorScreen).toContainText("USER_KICKED", { timeout: 20_000 });
        await expect(errorScreen).toContainText("Too loud");

        // Nothing is persisted: a reload brings Alice back.
        await alice.reload();
        await expect(alice.getByTestId("chat-btn")).toBeVisible({ timeout: 30_000 });
        await expect(alice.locator(".errorScreen")).toBeHidden();
    });

    test("an admin can remove someone from a conversation, and only from a shared one", async ({ browser }) => {
        await using admin = await getPage(browser, "Admin1", mapUrl());
        await using alice = await getPage(browser, "Alice", mapUrl());

        // Apart, they share no conversation: there is nothing to remove Alice from.
        await Map.teleportToPosition(admin, 1 * 32, 1 * 32);
        await Map.teleportToPosition(alice, 8 * 32, 8 * 32);
        await openModerationModal(admin, "Alice");
        await expect(admin.getByTestId("moderation-kick-action")).toBeVisible();
        await expect(admin.getByTestId("moderation-remove-action")).toBeHidden();
        await admin.getByTestId("closeModal").click();
        await expect(admin.getByTestId("blockmenu-block-user-button")).toBeHidden();

        // In the same bubble, the admin can remove Alice; Alice is offered nothing of the kind.
        await Map.teleportToPosition(alice, 2 * 32, 1 * 32);
        await expect(admin.locator("#cameras-container").getByText("Alice")).toBeVisible({ timeout: 30_000 });
        await openModerationModalFromVideo(alice, "Admin1");
        await expect(alice.getByTestId("moderation-remove-action")).toBeHidden();
        await alice.getByTestId("closeModal").click();
        await expect(alice.getByTestId("blockmenu-block-user-button")).toBeHidden();

        await openModerationModalFromVideo(admin, "Alice");
        await admin.getByTestId("moderation-remove-action").click();
        await expect(admin.getByTestId("moderation-text")).toBeHidden();
        await admin.getByTestId("moderation-submit").click();

        // Alice leaves the conversation but stays in the world.
        await expect(alice.getByText("A moderator removed you from the conversation")).toBeVisible({
            timeout: 20_000,
        });
        await expect(alice.locator("#cameras-container").getByText("Admin1")).toBeHidden({ timeout: 20_000 });
        await expect(alice.locator(".errorScreen")).toBeHidden();
    });
});
