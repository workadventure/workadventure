import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import Menu from "./menu";
import { dismissDuplicateUserConnectedModalIfShown } from "./duplicateUserModal";
import { dismissDoNotDisturbInfoToast } from "./doNotDisturbInfoToast";

export async function oidcLogin(page: Page, userName = "User1", password = "pwd") {
    const oidcUsernameInput = page.locator("#Input_Username");
    const appMenuButton = page.getByTestId("action-user");

    await expect(
        oidcUsernameInput.or(appMenuButton).first(),
        "Expected either the WorkAdventure menu or the OIDC login form to be visible",
    ).toBeVisible({ timeout: 40_000 });

    if (!(await oidcUsernameInput.isVisible())) {
        await Menu.openMenuIfMobile(page);
        await page.getByRole("button", { name: "Login" }).click();
    }

    await oidcUsernameInput.fill(userName, {
        timeout: 40_000,
    });
    await page.locator("#Input_Password").fill(password);

    await page.locator('button:has-text("Login")').click({
        // Give ample time for login to occur
        timeout: 50000,
    });

    // Dismiss the duplicate user connected modal if it is shown
    await dismissDuplicateUserConnectedModalIfShown(page);
    // Dismiss the do not disturb info toast if it is shown
    await dismissDoNotDisturbInfoToast(page);

    await expect(page.locator("#main-layout")).toBeVisible({
        timeout: 50_000,
    });
}

export async function oidcLogout(page: Page) {
    await Menu.openMenu(page);
    await page.getByRole("button", { name: "Log out" }).click();
}

export async function oidcAdminTagLogin(page: Page) {
    await oidcLogin(page, "User1", "pwd");
}

export async function oidcMatrixUserLogin(page: Page, userName = "UserMatrix") {
    await oidcLogin(page, userName, "pwd");
}

export async function oidcMemberTagLogin(page: Page) {
    await oidcLogin(page, "User2", "pwd");
}
