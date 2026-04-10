import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import { resetWamMaps } from "./utils/map-editor/uploader";
import Menu from "./utils/menu";
import AreaAccessRights from "./utils/areaAccessRights";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";

test.setTimeout(240_000);
test.describe("Personal area claim @oidc @nomobile @nowebkit", () => {
    test.beforeEach(({ page }) => {
        test.skip(isMobile(page), "Map editor is not available on mobile");
    });

    test.beforeEach(({ browserName }) => {
        test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
    });

    test("Claim popup is not shown to Joe when area is already claimed by Alice", async ({ browser, request }) => {
        // Given: Joe (admin) creates a personal area with dynamic claim mode.
        // When: Alice enters, claims it, then leaves. Joe then enters the same area.
        // Then: The claim popup must NOT be displayed (area is already claimed by Alice).

        await resetWamMaps(request);

        const areaCenterX = 4 * 32 * 1.5;
        const areaCenterY = 4 * 32 * 1.5;
        const outsideX = 15 * 32 * 1.5;
        const outsideY = 15 * 32 * 1.5;

        await using adminPage = await getPage(browser, "Admin1", Map.url("empty"));

        await Menu.openMapEditor(adminPage);
        await AreaAccessRights.openAreaEditorAndAddPersonalAreaWithDynamicClaim(adminPage);
        await Menu.closeMapEditor(adminPage);

        await using memberPage = await getPage(browser, "Member1", Map.url("empty"));

        await Map.teleportToPosition(memberPage, areaCenterX, areaCenterY);

        await expect(memberPage.getByTestId("claimPersonalAreaButton")).toBeVisible({ timeout: 15_000 });
        await memberPage.getByTestId("claimPersonalAreaButton").click();

        await Map.teleportToPosition(memberPage, outsideX, outsideY);

        await memberPage.context().close();

        await Map.teleportToPosition(adminPage, areaCenterX, areaCenterY);

        // Give time for area-enter logic; claim popup must not be shown when area is already claimed by another user.
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await adminPage.waitForTimeout(2_000);
        await expect(adminPage.getByTestId("claimPersonalAreaButton")).toHaveCount(0);

        await adminPage.context().close();
    });
});
