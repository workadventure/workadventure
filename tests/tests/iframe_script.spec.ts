import { expect, test } from '@playwright/test';
import { login } from './utils/roles';

test.describe('Iframe API', () => {
  test('can be called from an iframe loading a script', async ({
    page,
  }) => {
    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Metadata/cowebsiteAllowApi.json'
    );

    await login(page);

    // FIXME e2e test related to chat
    //await expect(page.locator('p.other-text')).toHaveText('The iframe opened by a script works !', {useInnerText: true});
  });

  test('can add a custom menu by scripting API', async ({
                                                                 page,
                                                               }) => {
    await page.goto(
        'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Metadata/customMenu.json'
    );

    await login(page);

    await page.click('#menuIcon img:first-child');

    await page.click('button:has-text("custom iframe menu")');

    const iframeParagraph = page
        .frameLocator('.menu-submenu-container iframe')
        .locator('p');
    await expect(iframeParagraph).toHaveText('This is an iframe in a custom menu.');

    // FIXME e2e test related to chat
    //await page.click('button:has-text("custom callback menu")');
    //await expect(page.locator('p.other-text')).toHaveText('Custom menu clicked', {useInnerText: true});
  });
});
