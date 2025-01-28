import { expect, Page } from "@playwright/test";
import Menu from "./menu";
import {getDevices} from "./devices";


// for oidcLogin to work on mobile you must open the burger menu before calling this function
export async function oidcLogin(
  page: Page,
  userName = "User1",
  password = "pwd"
) {
  if (getDevices(page)) {
    await page.getByTestId('burger-menu').click();
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

export async function oidcLogout(page: Page) {
  if (getDevices(page)) {
    await page.getByTestId('burger-menu').click();
  }
  else {
    await Menu.openMenu(page);
  }
  await page.getByRole('button', { name: 'Log out' }).click();
}

export async function oidcAdminTagLogin(page: Page) {
  await oidcLogin(page, "User1", "pwd");
}

export async function oidcMatrixUserLogin(page: Page) {
  await oidcLogin(page, "UserMatrix", "pwd");
}

export async function oidcMemberTagLogin(page: Page) {
  await oidcLogin(page, "User2", "pwd");
}
