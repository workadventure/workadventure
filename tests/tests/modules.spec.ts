import { test } from '@playwright/test';
import { assertLogMessage, startRecordLogs} from './utils/log';
import { login } from './utils/roles';
import {RENDERER_MODE} from "./utils/environment";

test.describe('Module', () => {
  test('loading should work out of the box', async ({ page }, { project }) => {
    // Skip test for mobile device
    if(project.name === "mobilechrome") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    startRecordLogs(page);
    await page.goto(
      `/_/global/maps.workadventure.localhost/tests/Modules/with_modules.json?phaserMode=${RENDERER_MODE}`
    );

    await login(page, 'Alice', 2);

    await assertLogMessage(page, 'Successfully loaded module: foo =  bar');
  });
});
