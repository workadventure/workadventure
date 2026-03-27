import { expect, test } from "@playwright/test";
import { RENDERER_MODE } from "./utils/environment";
import { publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import Menu from "./utils/menu";
import { ensureWebAppInstallMenuEligibility } from "./utils/pwaInstall";

test.describe("Web App install from profile menu @nodesktop", () => {
    test("opens the Web App install screen when clicking Install Web App in the profile menu", async ({ browser }) => {
        await using page = await getPage(
            browser,
            "Alice",
            publicTestMapUrl("tests/E2E/empty.json", "pwa_install_menu", RENDERER_MODE),
        );

        // getPage may persist "never show" for the install screen; restore eligibility for the menu entry
        await ensureWebAppInstallMenuEligibility(page);

        await Menu.openMenu(page);

        await expect(page.getByTestId("profile-menu-install-web-app")).toBeVisible({ timeout: 20_000 });
        await page.getByTestId("profile-menu-install-web-app").click();

        await expect(page.getByTestId("pwa-install-skip")).toBeVisible({ timeout: 20_000 });

        await page.getByTestId("pwa-install-skip").click();

        await expect(page.getByTestId("microphone-button")).toBeVisible({ timeout: 120_000 });
    });
});
