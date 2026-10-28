import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import AreaEditor from "./utils/map-editor/areaEditor";
import { resetWamMaps } from "./utils/map-editor/uploader";
import MapEditor from "./utils/mapeditor";
import Menu from "./utils/menu";
import { map_storage_url, publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import chatUtils from "./utils/chat";

// An accepted invitation lets the invitee walk through a lock once, for 2 minutes (the expiry is covered by
// back/tests/GameRoom.test.ts).

test.describe("Meeting invitation through a locked bubble @nomobile @nowebkit", () => {
    test.beforeEach(async ({ browserName, page }) => {
        test.skip(browserName === "webkit" || isMobile(page), "Skip on WebKit and mobile");
    });

    async function isInBubbleWith(page: Page, name: string): Promise<void> {
        await expect(page.locator("#cameras-container").getByText(name).first()).toBeVisible({ timeout: 30_000 });
    }

    async function isNotInBubbleWith(page: Page, name: string): Promise<void> {
        // Give the back time to (wrongly) put the users together before checking they are still apart
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(3_000);
        await expect(page.locator("#cameras-container").getByText(name)).toBeHidden();
    }

    const mapUrl = publicTestMapUrl("tests/E2E/empty.json", "meeting");

    // Alice and Bob talk in a bubble that Alice locks. Carol stands in the corner, too far to join.
    async function formBubble(alice: Page, bob: Page, carol: Page, lock = true): Promise<void> {
        await Map.teleportToPosition(carol, 32, 300);
        await Map.teleportToPosition(alice, 160, 160);
        await Map.teleportToPosition(bob, 200, 160);
        await isInBubbleWith(alice, "Bob");
        if (lock) {
            await alice.getByTestId("lock-button").click();
            await expect(alice.getByTestId("lock-button")).toHaveClass(/bg-danger/);
        }
    }

    test("Without an invitation, the locked bubble keeps the user out", async ({ browser }) => {
        await using alice = await getPage(browser, "Alice", mapUrl);
        await using bob = await getPage(browser, "Bob", mapUrl);
        await using carol = await getPage(browser, "Carol", mapUrl);
        await formBubble(alice, bob, carol);

        await Map.walkToPosition(carol, 180, 200);

        await isNotInBubbleWith(alice, "Carol");
    });

    test("Invited user walks into the locked bubble", async ({ browser }, testInfo) => {
        await using alice = await getPage(browser, "Alice", mapUrl);
        await using bob = await getPage(browser, "Bob", mapUrl);
        await using carol = await getPage(browser, "Carol", mapUrl);
        await formBubble(alice, bob, carol);

        await chatUtils.UL_invite(alice, "Carol");
        await expect(carol.getByTestId("meeting-invitation-popup")).toBeVisible({ timeout: 15_000 });
        await testInfo.attach("invitation-popup", {
            body: await carol.getByTestId("meeting-invitation-popup").screenshot(),
            contentType: "image/png",
        });
        await chatUtils.UL_acceptInvitation(carol);

        await isInBubbleWith(alice, "Carol");
        await isInBubbleWith(carol, "Bob");
        await testInfo.attach("invitee-in-locked-bubble", { body: await carol.screenshot(), contentType: "image/png" });
    });

    test("A declined invitation keeps the lock", async ({ browser }) => {
        await using alice = await getPage(browser, "Alice", mapUrl);
        await using bob = await getPage(browser, "Bob", mapUrl);
        await using carol = await getPage(browser, "Carol", mapUrl);
        await formBubble(alice, bob, carol);

        await chatUtils.UL_invite(alice, "Carol");
        await chatUtils.UL_declineInvitation(carol);
        await Map.walkToPosition(carol, 180, 200);

        await isNotInBubbleWith(alice, "Carol");
    });

    test("Invitee in a locked bubble brings the inviter in instead of leaving", async ({ browser }, testInfo) => {
        await using alice = await getPage(browser, "Alice", mapUrl);
        await using bob = await getPage(browser, "Bob", mapUrl);
        await using carol = await getPage(browser, "Carol", mapUrl);
        await formBubble(alice, bob, carol);

        // Carol, alone, invites Bob, who is talking with Alice in a locked bubble
        await chatUtils.UL_invite(carol, "Bob");
        const popup = bob.getByTestId("meeting-invitation-popup");
        await expect(popup).toBeVisible({ timeout: 15_000 });
        await expect(popup.getByText("Joining makes you leave your current conversation.")).toBeVisible();
        await testInfo.attach("invitation-popup-in-bubble", {
            body: await popup.screenshot(),
            contentType: "image/png",
        });
        await bob.getByTestId("meeting-invitation-bring").click();

        await expect(
            carol
                .locator(".toast-container")
                .filter({ hasText: "Bob accepted: you are walking to their conversation" }),
        ).toBeVisible({ timeout: 10_000 });
        await isInBubbleWith(carol, "Alice");
        await isInBubbleWith(bob, "Carol");
    });

    test("Invitee in a bubble can still join the inviter, leaving their conversation", async ({ browser }) => {
        await using alice = await getPage(browser, "Alice", mapUrl);
        await using bob = await getPage(browser, "Bob", mapUrl);
        await using carol = await getPage(browser, "Carol", mapUrl);
        await formBubble(alice, bob, carol, false);

        await chatUtils.UL_invite(carol, "Bob");
        await expect(bob.getByTestId("meeting-invitation-popup")).toBeVisible({ timeout: 15_000 });
        await bob.getByTestId("meeting-invitation-accept").click();

        await isInBubbleWith(carol, "Bob");
        await expect(alice.locator("#cameras-container").getByText("Bob")).toBeHidden({ timeout: 15_000 });
    });

    test("The invitation lets the user in only once", async ({ browser }) => {
        await using alice = await getPage(browser, "Alice", mapUrl);
        await using bob = await getPage(browser, "Bob", mapUrl);
        await using carol = await getPage(browser, "Carol", mapUrl);
        await formBubble(alice, bob, carol);

        await chatUtils.UL_invite(alice, "Carol");
        await chatUtils.UL_acceptInvitation(carol);
        await isInBubbleWith(alice, "Carol");

        await Map.teleportToPosition(carol, 32, 300);
        await expect(alice.locator("#cameras-container").getByText("Carol")).toBeHidden({ timeout: 15_000 });
        await Map.walkToPosition(carol, 180, 200);

        await isNotInBubbleWith(alice, "Carol");
    });
});

test.describe("Meeting invitation through a locked area @oidc @nomobile @nowebkit", () => {
    test.setTimeout(240_000);
    test.use({
        baseURL: map_storage_url,
    });

    test.beforeEach(async ({ browserName, page }) => {
        test.skip(browserName === "webkit" || isMobile(page), "Map editor is not available on mobile and WebKit");
    });

    // The area covers tiles 1 to 7. Alice spawns on its left, outside.
    const areaLeftBoundX = 1 * 32;

    // Admin1 draws a lockable area (with more properties if asked), stands inside and locks it.
    async function createLockedArea(admin: Page, configureArea: (page: Page) => Promise<void> = async () => {}) {
        await Menu.openMapEditor(admin);
        await MapEditor.openAreaEditor(admin);
        await AreaEditor.drawArea(admin, { x: 1 * 32, y: 1 * 32 }, { x: 7 * 32, y: 7 * 32 });
        await AreaEditor.addProperty(admin, "lockableAreaPropertyData");
        await configureArea(admin);
        await Menu.closeMapEditor(admin);

        await Map.teleportToPosition(admin, 4 * 32, 4 * 32);
        await admin.getByTestId("lock-button").click();
        await expect(admin.getByTestId("lock-button")).toHaveClass(/bg-danger/);
    }

    async function expectInsideArea(page: Page): Promise<void> {
        await expect
            .poll(async () => (await Map.getPosition(page)).x, { timeout: 15_000 })
            .toBeGreaterThan(areaLeftBoundX);
    }

    async function expectStaysOutsideArea(page: Page): Promise<void> {
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(3_000);
        expect((await Map.getPosition(page)).x).toBeLessThanOrEqual(areaLeftBoundX);
    }

    test("Invited user walks into the locked area, only once", async ({ browser, request }, testInfo) => {
        await resetWamMaps(request);
        await using admin = await getPage(browser, "Admin1", Map.url("empty"));
        await createLockedArea(admin);
        await using alice = await getPage(browser, "Alice", Map.url("empty"));

        await chatUtils.UL_invite(admin, "Alice");
        await chatUtils.UL_acceptInvitation(alice);
        await expectInsideArea(alice);
        await testInfo.attach("invitee-in-locked-area", { body: await alice.screenshot(), contentType: "image/png" });

        // Back out: the lock applies to Alice again
        await Map.teleportToPosition(alice, 0, 3 * 32);
        await Map.walkTo(alice, "ArrowRight", 1000);
        await expect(alice.getByText("This area is locked. You cannot enter.")).toBeAttached();
        expect((await Map.getPosition(alice)).x).toBeLessThanOrEqual(areaLeftBoundX);
    });

    test("The invitation does not open an area the user has no access to", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using admin = await getPage(browser, "Admin1", Map.url("empty"));
        await createLockedArea(admin, (page) => AreaEditor.setAreaRightProperty(page, [], ["admin"]));
        await using alice = await getPage(browser, "Alice", Map.url("empty"));

        await chatUtils.UL_invite(admin, "Alice");
        await chatUtils.UL_acceptInvitation(alice);

        await expectStaysOutsideArea(alice);
    });

    test("The invitation does not open a full area", async ({ browser, request }) => {
        await resetWamMaps(request);
        await using admin = await getPage(browser, "Admin1", Map.url("empty"));
        await createLockedArea(admin, async (page) => {
            await AreaEditor.addProperty(page, "maxUsersInAreaPropertyData");
            const maxUsersInput = page.locator("#maxUsersInArea");
            await expect(maxUsersInput).toBeVisible();
            await maxUsersInput.fill("1");
            await maxUsersInput.blur();
        });
        await using alice = await getPage(browser, "Alice", Map.url("empty"));

        await chatUtils.UL_invite(admin, "Alice");
        await chatUtils.UL_acceptInvitation(alice);

        await expectStaysOutsideArea(alice);
    });
});
