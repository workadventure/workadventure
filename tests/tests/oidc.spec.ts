import { expect, test } from '@playwright/test';
import {oidcLogin, oidcLogout} from "./utils/oidc";
import {evaluateScript} from "./utils/scripting";
import {publicTestMapUrl} from "./utils/urls";
import {getPage} from "./utils/auth";
import {isMobile} from "./utils/isMobile";

test.describe('OpenID connect @oidc @nomobile', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(isMobile(page), 'Skip on mobile devices');
  });
  // https://github.com/element-hq/synapse/issues/19303 - skip webkit due to synapse v1.144.0 OIDC issues 
  test('can login and logout @nowebkit', async ({ browser }) => {
    await using page = await getPage(browser, 'Alice', publicTestMapUrl("tests/E2E/empty.json", "oidc"))

    // Test if player variable is correct
    let isLogged = await evaluateScript(page, async () => {
      await WA.onInit();
      return WA.player.isLogged;
    });
    expect(isLogged).toBe(false);

    // Sign in, then sign out
    await oidcLogin(page);

    // Test if player variable is correct
    isLogged = await evaluateScript(page, async () => {
      await WA.onInit();
      return WA.player.isLogged;
    });
    expect(isLogged).toBe(true);

    // Log out user
    await oidcLogout(page);
    await expect(page.locator('button:has-text("Login")')).toBeVisible();
    // Let's check the sign-in button is back here when we signed out
    await page.getByRole('button', { name: 'Share' }).click();
    await expect(page.locator('button:has-text("Login")')).toContainText("Login");

    // Let's try to login using the scripting API
    await evaluateScript(page, async () => {
      await WA.onInit();
      await WA.nav.goToLogin();
    });
    await expect(page.locator('#Input_Username')).toBeVisible();
  });
});
