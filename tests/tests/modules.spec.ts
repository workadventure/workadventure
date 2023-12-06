import { test } from '@playwright/test';
import { assertLogMessage, startRecordLogs} from './utils/log';
import { login } from './utils/roles';
import {RENDERER_MODE} from "./utils/environment";

test.describe('Module', () => {
  test('loading should work out of the box', async ({ page }) => {
    startRecordLogs(page);
    await page.goto(
      `http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Modules/with_modules.json?phaserMode=${RENDERER_MODE}`
    );

    await login(page, 'Alice', 2);

    await assertLogMessage(page, 'Successfully loaded module: foo =  bar');
  });
});
