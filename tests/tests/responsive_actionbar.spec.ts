import { expect, test, type Page } from "@playwright/test";
import { evaluateScript } from "./utils/scripting";
import { publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import Menu from "./utils/menu";

const actionBarButton = (page: Page, name: string) =>
    page.locator("#action-wrapper").getByRole("button", { name, exact: true });

const profileMenuButton = (page: Page, name: string) =>
    page.getByTestId("profile-menu").getByRole("button", { name, exact: true });

test.describe("Action bar responsiveness @nomobile", () => {
    test.beforeEach(async ({ page }) => {
        test.skip(isMobile(page), "Skip on mobile devices");
    });

    test("Check items in the action bar go in the menu one by one @oidc", async ({ browser }) => {
        await using page = await getPage(
            browser,
            "Alice",
            publicTestMapUrl("tests/E2E/empty.json", "responsive_actionbar"),
        );
        // Use script to add new button
        await evaluateScript(page, async () => {
            WA.ui.actionBar.addButton({
                id: "register-btn",
                label: "Register",
                bgColor: "#4056F6",
                callback: () => {
                    WA.ui.actionBar.removeButton("register-btn");
                },
            });
            WA.ui.actionBar.addButton({
                id: "download-btn",
                isGradient: true,
                label: "Download",
                bgColor: "#eab127",

                callback: () => {
                    WA.ui.actionBar.removeButton("download-btn");
                },
            });
            WA.ui.actionBar.addButton({
                id: "inventory-btn",
                label: "Inventory",
                callback: () => {
                    WA.ui.actionBar.removeButton("inventory-btn");
                },
            });
        });

        await expect(actionBarButton(page, "Register")).toBeVisible();
        await expect(actionBarButton(page, "Download")).toBeVisible();
        await expect(actionBarButton(page, "Inventory")).toBeVisible();

        await page.setViewportSize({ width: 650, height: 600 });

        await expect(actionBarButton(page, "Register")).toBeHidden({ timeout: 20_000 });
        await expect(actionBarButton(page, "Download")).toBeHidden({ timeout: 20_000 });
        await expect(actionBarButton(page, "Inventory")).toBeVisible();

        await Menu.openMenu(page);

        await expect(profileMenuButton(page, "Register")).toBeVisible();
        await expect(profileMenuButton(page, "Download")).toBeVisible();

        await Menu.closeMenu(page);

        await expect(actionBarButton(page, "Share")).toBeVisible();
        await expect(actionBarButton(page, "Login")).toBeVisible();

        await page.setViewportSize({ width: 345, height: 600 });

        await expect(actionBarButton(page, "Share")).toBeHidden({ timeout: 20_000 });
        await expect(actionBarButton(page, "Login")).toBeHidden({ timeout: 20_000 });

        await Menu.openMenu(page);

        await expect(profileMenuButton(page, "Share")).toBeVisible();
        await expect(profileMenuButton(page, "Login")).toBeVisible();

        await page.context().close();
    });
});
