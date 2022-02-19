import { expect, test } from '@playwright/test';
import { assertLogMessage } from './utils/log';
import { login } from './utils/roles';

test.describe('Module', () => {
  test('loading should work out of the box', async ({ page }) => {
    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Modules/with_modules.json'
    );

    await login(page, 'Alice', 2);

    await assertLogMessage(page, 'Successfully loaded module: foo =  bar');
  });
});
