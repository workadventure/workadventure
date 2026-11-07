import { expect, test, type Page } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { getPage } from "../utils/auth";
import { isMobile } from "../utils/isMobile";
import ChatUtils from "./chatUtils";

test.setTimeout(120000);

function mentionOption(page: Page, name: RegExp) {
    return page.getByTestId("mentionSuggestions").getByRole("option").filter({ hasText: name });
}

test.describe("Proximity chat mentions @oidc @nomobile @nowebkit", () => {
    test.beforeEach(async ({ request, browserName, page }) => {
        test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
        test.skip(isMobile(page), "Proximity chat smoke tests target the desktop chat layout");
        await resetWamMaps(request);
    });

    test("notifies the member mentioned in the bubble, and offers @room to the map admins only", async ({
        browser,
    }) => {
        await using adminPage = await getPage(browser, "Admin1", Map.url("empty"));
        await using memberPage = await getPage(browser, "Member1", Map.url("empty"));
        await Map.teleportToPosition(adminPage, 160, 160);
        await Map.teleportToPosition(memberPage, 160, 160);
        await expect(adminPage.locator("#cameras-container").getByText("Member1", { exact: true }).first()).toBeVisible(
            {
                timeout: 60_000,
            },
        );
        await expect(memberPage.locator("#cameras-container").getByText("Admin1", { exact: true }).first()).toBeVisible(
            {
                timeout: 60_000,
            },
        );
        await ChatUtils.openProximityRoom(adminPage);
        await ChatUtils.openProximityRoom(memberPage);

        // Member1 is not an admin of the map: no @room.
        await memberPage.getByTestId("messageInput").click();
        await memberPage.keyboard.type("@");
        await expect(mentionOption(memberPage, /Admin1/)).toBeVisible();
        await expect(mentionOption(memberPage, /^\s*@\s*room/)).toHaveCount(0);
        await memberPage.keyboard.press("Escape");
        await memberPage.keyboard.press("Backspace");
        // Closed on purpose, the chat no longer opens on a new message: the mention shows a notification instead.
        await ChatUtils.closeChat(memberPage);

        await adminPage.getByTestId("messageInput").click();
        await adminPage.keyboard.type("@");
        await expect(mentionOption(adminPage, /^\s*@\s*room/)).toBeVisible();
        await adminPage.keyboard.type("Mem");
        await expect(mentionOption(adminPage, /Member1/)).toBeVisible();
        await adminPage.keyboard.press("Enter");
        await adminPage.keyboard.type("time for the demo");
        await adminPage.keyboard.press("Enter");

        await expect(memberPage.getByText("Admin1 mentioned you")).toBeVisible({ timeout: 30_000 });
        await expect(memberPage.getByTestId("proximity-notification-message")).toHaveText(
            /^@Member1\s+time for the demo$/,
        );
    });
});
