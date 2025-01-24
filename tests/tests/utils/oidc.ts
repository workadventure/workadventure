import { expect, Page } from "@playwright/test";
import Menu from "./menu";

export async function oidcLogin(
  page: Page,
  isMobile = false,
  userName = "User1",
  password = "pwd"
) {
  if (isMobile) {
    await page.getByRole('link', { name: 'Login' }).click();
  }
  else {
    await page.click('a:has-text("Login")');
  }
  await page.fill("#Input_Username", userName, {
    timeout: 40_000,
  });
  await page.fill("#Input_Password", password);

  await page.click('button:has-text("Login")', {
    // Give ample time for login to occur
    timeout: 50000
  });

  await expect(page.locator('#main-layout')).toBeVisible({
    timeout: 50_000,
  });
}

export async function oidcLogout(page: Page, isMobile = false) {
  if (isMobile) {
    await page.getByTestId('burger-menu').click();
  }
  else {
    await Menu.openMenu(page);
  }
  await page.getByRole('button', { name: 'Log out' }).click();
}

export async function oidcAdminTagLogin(page, isMobile = false) {
  await oidcLogin(page, isMobile, "User1", "pwd");
}

export async function oidcMatrixUserLogin(page, isMobile = false) {
  await oidcLogin(page, isMobile, "UserMatrix", "pwd");
}

export async function oidcMemberTagLogin(page, isMobile = false) {
  await oidcLogin(page, isMobile, "User2", "pwd");
}
