import { expect, test } from '@playwright/test';
import { login } from './utils/roles';
import {oidcLogin, oidcLogout} from "./utils/oidc";
import {evaluateScript} from "./utils/scripting";
import {RENDERER_MODE} from "./utils/environment";

test.describe('OpenID connect @oidc', () => {
  test('can login and logout', async ({
    page,
  }) => {
    await page.goto(
        `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json?phaserMode=${RENDERER_MODE}`
    );

    await login(page);

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

    // Let's check the sign in button is back here when we signed out
    await page.click('#menuIcon img:first-child');
    await expect(page.locator('a:has-text("Sign in")')).toContainText("Sign in");

    // Let's try to login using the scripting API
    await evaluateScript(page, async () => {
      await WA.onInit();
      await WA.nav.goToLogin();
    });
    await expect(page.locator('#Input_Username')).toBeVisible();
  });
});
