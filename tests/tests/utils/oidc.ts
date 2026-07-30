import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import Menu from "./menu";
import { isMobile } from "./isMobile";
import { dismissDuplicateUserConnectedModalIfShown } from "./duplicateUserModal";
import { dismissNoBrowserSoundInfoToast } from "./doNotDisturbInfoToast";

export async function oidcLogin(page: Page, userName = "User1", password = "pwd") {
    const loginButton = page.getByRole("button", { name: "Login" });

    // On mobile the "Login" button can overflow out of the action bar into the profile menu
    // (e.g. when other action-bar buttons take up the available width). Try clicking it directly
    // first; if it isn't reachable, open the profile menu and retry. On the dedicated login page
    // (WA.nav.goToLogin()) the button is always directly visible, so the direct click succeeds.
    if (isMobile(page)) {
        try {
            await loginButton.click({ timeout: 5_000 });
        } catch {
            await Menu.openMenu(page);
            await loginButton.click();
        }
    } else {
        await loginButton.click();
    }

    await page.fill("#Input_Username", userName, {
        timeout: 40_000,
    });
    await page.fill("#Input_Password", password);

    await page.click('button:has-text("Login")', {
        // Give ample time for login to occur
        timeout: 50000,
    });

    // Dismiss the duplicate user connected modal if it is shown
    await dismissDuplicateUserConnectedModalIfShown(page);
    // Dismiss the do not disturb info toast if it is shown
    await dismissNoBrowserSoundInfoToast(page);

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
