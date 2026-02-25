import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import { resetWamMaps } from "./utils/map-editor/uploader";
import Menu from "./utils/menu";
import AreaAccessRights from "./utils/areaAccessRights";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";

test.setTimeout(240_000);
test.describe("Personal desk spawn on connect @oidc @nomobile @nowebkit", () => {
    test.beforeEach(({ page }) => {
        test.skip(isMobile(page), "Map editor is not available on mobile");
    });

    test.beforeEach(({ browserName }) => {
        test.skip(browserName === "webkit", "WebKit has issues with camera/microphone");
    });

    test("User with personal desk spawns at start then walks to desk on connect", async ({ browser, request }) => {
        // Given: Admin creates a personal area (dynamic claim). Member1 connects, enters the area and claims it.
        // When: Member1 reloads the page (new connection).
        // Then: Member1 spawns at start, then automatically walks to their personal desk.
        // We assert: after reload and enough time, the user is inside their personal desk (button "Walk to my desk" is disabled).

        await resetWamMaps(request);

        const areaCenterX = 4 * 32 * 1.5;
        const areaCenterY = 4 * 32 * 1.5;

        await using adminPage = await getPage(browser, "Admin1", Map.url("empty"));

        await Menu.openMapEditor(adminPage);
        await AreaAccessRights.openAreaEditorAndAddPersonalAreaWithDynamicClaim(adminPage);
        await Menu.closeMapEditor(adminPage);

        await adminPage.context().close();

        await using memberPage = await getPage(browser, "Member1", Map.url("empty"));

        await Map.teleportToPosition(memberPage, areaCenterX, areaCenterY);

        await expect(memberPage.getByTestId("claimPersonalAreaButton")).toBeVisible({ timeout: 15_000 });
        await memberPage.getByTestId("claimPersonalAreaButton").click();

        // Reload to simulate a new connection: user should spawn at start then walk to desk
        await memberPage.reload();

        await Menu.waitForMapLoad(memberPage);

        await Menu.openMapMenu(memberPage);
        const goToDeskButton = memberPage.getByTestId("go-to-personal-desk-button");
        await expect(goToDeskButton).toBeVisible({ timeout: 15_000 });
        // User should be inside their personal area: "Walk to my desk" button is disabled
        await expect(goToDeskButton).toHaveClass(/opacity-50|cursor-not-allowed/);

        await memberPage.context().close();
    });
});
