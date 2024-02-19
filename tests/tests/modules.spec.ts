import { test } from '@playwright/test';
import { assertLogMessage, startRecordLogs} from './utils/log';
import { login } from './utils/roles';
import {RENDERER_MODE} from "./utils/environment";
import {publicTestMapUrl} from "./utils/urls";

test.describe('Module', () => {
  test('loading should work out of the box', async ({ page }) => {
    startRecordLogs(page);
    await page.goto(
      publicTestMapUrl("tests/Modules/with_modules.json", "modules")
    );

    await login(page, 'Alice', 2);

    await assertLogMessage(page, 'Successfully loaded module: foo =  bar');
  });
});
