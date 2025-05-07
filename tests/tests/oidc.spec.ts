import { expect, test } from '@playwright/test';
import {oidcLogin, oidcLogout} from "./utils/oidc";
import {evaluateScript} from "./utils/scripting";
import {publicTestMapUrl} from "./utils/urls";
import {getPage} from "./utils/auth";
import {isMobile} from "./utils/isMobile";

test.describe('OpenID connect @oidc', () => {
  test.beforeEach(async ({ page }) => {
    if (isMobile(page)) {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
    }
  });
  test('can login and logout', async ({ browser }) => {
    const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "oidc"))

    // Test if player variable is correct
    let isLogged = await evaluateScript(page, async () => {
      await WA.onInit();
      return WA.player.isLogged;
    });
    await expect(isLogged).toBe(false);

    // Sign in, then sign out
    await oidcLogin(page);

    // Test if player variable is correct
    isLogged = await evaluateScript(page, async () => {
      await WA.onInit();
      return WA.player.isLogged;
    });
    await expect(isLogged).toBe(true);

    // Log out user
    await oidcLogout(page);
    await expect(page.locator('button:has-text("Login")')).toBeVisible();
    // Let's check the sign-in button is back here when we signed out
    await page.getByRole('button', { name: 'Invite' }).click();
    await expect(page.locator('button:has-text("Login")')).toContainText("Login");

    // Let's try to login using the scripting API
    await evaluateScript(page, async () => {
      await WA.onInit();
      await WA.nav.goToLogin();
    });
    await expect(page.locator('#Input_Username')).toBeVisible();
  });
});
