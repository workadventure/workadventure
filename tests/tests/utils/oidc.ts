import { expect, Page } from "@playwright/test";

export async function oidcLogin(
  page: Page,
  userName = "User1",
  password = "pwd",
  isMobile: boolean
) {
  if(isMobile){
      await expect(page.locator('button#burgerIcon')).toBeVisible();
      const mobileMenuVisible = await page.locator('button#burgerIcon img.tw-rotate-0').isVisible();
      if(mobileMenuVisible){
          await page.click('button#burgerIcon');
      }
  }
  await page.click("#menuIcon img:first-child");
  await page.click('a:has-text("Sign in")');

  await page.fill("#Input_Username", userName);
  await page.fill("#Input_Password", password);

  await page.click('button:has-text("Login")');
}

export async function oidcLogout(page: Page, isMobile: boolean) {
  if(isMobile){
      await expect(page.locator('button#burgerIcon')).toBeVisible();
      const mobileMenuVisible = await page.locator('button#burgerIcon img.tw-rotate-0').isVisible();
      if(mobileMenuVisible){
          await page.click('button#burgerIcon');
      }
  }
  await page.click("#menuIcon img:first-child");
  await page.click('button:has-text("Log out")');
}

export async function oidcAdminTagLogin(page, isMobile: boolean) {
  await oidcLogin(page, "User1", "pwd", isMobile);
}

export async function oidcMatrixUserLogin(page, isMobile: boolean) {
  await oidcLogin(page, "UserMatrix", "pwd", isMobile);
}

export async function oidcMemberTagLogin(page, isMobile: boolean) {
  await oidcLogin(page, "User2", "pwd", isMobile);
}
