import { test } from '@playwright/test';
import { assertLogMessage, startRecordLogs} from './utils/log';
import { login } from './utils/roles';

test.describe('Module', () => {
  test('loading should work out of the box', async ({ page }) => {
    startRecordLogs(page);
    await page.goto(
      'http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Modules/with_modules.json'
    );

    await login(page, 'Alice', 2);

    await assertLogMessage(page, 'Successfully loaded module: foo =  bar');
  });
});
