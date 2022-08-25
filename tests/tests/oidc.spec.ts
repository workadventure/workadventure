import { expect, test } from '@playwright/test';
import { login } from './utils/roles';
import {oidcLogin, oidcLogout} from "./utils/oidc";

test.describe('OpenID connect', () => {
  test('can login and logout', async ({
    page,
  }) => {
    await page.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/E2E/empty.json'
    );

    await login(page);

    // Sign in, then sign out
    await oidcLogin(page);
    await oidcLogout(page);

    // Let's check the sign in button is back here when we signed out
    await page.click('#menuIcon img:first-child');
    await expect(page.locator('a:has-text("Sign in")')).toContainText("Sign in");
  });
});
