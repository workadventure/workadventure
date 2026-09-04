import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import Map from "../utils/map";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Menu from "../utils/menu";
import { map_storage_url } from "../utils/urls";
import AreaAccessRights from "../utils/areaAccessRights";
import { evaluateScript } from "../utils/scripting";
import { getPage } from "../utils/auth";
import { isMobile } from "../utils/isMobile";

test.setTimeout(240_000); // Fix Webkit that can take more than 60s
test.use({
    baseURL: map_storage_url,
});

// The area drawn by AreaAccessRights spans topLeft (1*32, 2*32) .. bottomRight (7*32, 7*32).
const AREA = { minX: 1 * 32, minY: 2 * 32, maxX: 7 * 32, maxY: 7 * 32 };
function isInsideArea(position: { x: number; y: number }): boolean {
    return position.x >= AREA.minX && position.x <= AREA.maxX && position.y >= AREA.minY && position.y <= AREA.maxY;
}

async function tryTeleport(page: Page, position: { x: number; y: number }): Promise<boolean> {
    // Returns true if the teleport was rejected, false if it resolved.
    return evaluateScript(
        page,
        async ({ x, y }) => {
            try {
                // eslint-disable-next-line
                // @ts-ignore
                await WA.player.teleport(x, y);
                return false;
            } catch {
                return true;
            }
        },
        position,
    );
}

async function getPosition(page: Page): Promise<{ x: number; y: number }> {
    return evaluateScript(page, async () => {
        // eslint-disable-next-line
        // @ts-ignore
        return await WA.player.getPosition();
    });
}

test.describe("Restricted area access is enforced against the scripting API @oidc @nomobile @nowebkit", () => {
    test.beforeEach(
        "Skip where unsupported: mobile (no map editor) and WebKit (camera/mic)",
        ({ page, browserName }) => {
            test.skip(isMobile(page), "Map editor is not available on mobile");
            test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
        },
    );

    test("WA.player.teleport into a restricted area is rejected and the player stays out", async ({
        browser,
        request,
    }) => {
        await resetWamMaps(request);

        // An admin draws an admin-only area.
        await using adminPage = await getPage(browser, "Admin1", Map.url("empty"));
        await Menu.openMapEditor(adminPage);
        await AreaAccessRights.openAreaEditorAndAddAreaWithRights(adminPage, ["admin"], ["admin"]);
        await Menu.closeMapEditor(adminPage);
        await adminPage.close();

        // A user without the "admin" tag joins and tries to teleport inside the area.
        await using page = await getPage(browser, "User1", Map.url("empty"));
        // eslint-disable-next-line
        await page.waitForTimeout(1000);

        const rejected = await tryTeleport(page, AreaAccessRights.entityPositionInArea);
        expect(rejected).toBe(true);

        // eslint-disable-next-line
        await page.waitForTimeout(500);
        expect(isInsideArea(await getPosition(page))).toBe(false);
    });

    test("WA.player.moveTo into a restricted area is rejected", async ({ browser, request }) => {
        await resetWamMaps(request);

        await using adminPage = await getPage(browser, "Admin1", Map.url("empty"));
        await Menu.openMapEditor(adminPage);
        await AreaAccessRights.openAreaEditorAndAddAreaWithRights(adminPage, ["admin"], ["admin"]);
        await Menu.closeMapEditor(adminPage);
        await adminPage.close();

        await using page = await getPage(browser, "User1", Map.url("empty"));
        // eslint-disable-next-line
        await page.waitForTimeout(1000);

        const rejected = await evaluateScript(
            page,
            async ({ x, y }) => {
                try {
                    // eslint-disable-next-line
                    // @ts-ignore
                    await WA.player.moveTo(x, y);
                    return false;
                } catch {
                    return true;
                }
            },
            AreaAccessRights.entityPositionInArea,
        );
        expect(rejected).toBe(true);

        // eslint-disable-next-line
        await page.waitForTimeout(500);
        expect(isInsideArea(await getPosition(page))).toBe(false);
    });

    test("A user with the required tag can teleport into the restricted area", async ({ browser, request }) => {
        await resetWamMaps(request);

        // Area readable by members.
        await using adminPage = await getPage(browser, "Admin1", Map.url("empty"));
        await Menu.openMapEditor(adminPage);
        await AreaAccessRights.openAreaEditorAndAddAreaWithRights(adminPage, ["admin"], ["member"]);
        await Menu.closeMapEditor(adminPage);
        await adminPage.close();

        // A member has read access, so the teleport must succeed and land inside the area.
        await using page = await getPage(browser, "Member1", Map.url("empty"));
        // eslint-disable-next-line
        await page.waitForTimeout(1000);

        const rejected = await tryTeleport(page, AreaAccessRights.entityPositionInArea);
        expect(rejected).toBe(false);

        // eslint-disable-next-line
        await page.waitForTimeout(500);
        expect(isInsideArea(await getPosition(page))).toBe(true);
    });
});
