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

    await expect(page.locator('p.other-text')).toHaveText('The iframe opened by a script works !', {useInnerText: true});
  });
});
