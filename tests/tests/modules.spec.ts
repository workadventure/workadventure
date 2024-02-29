import { test } from '@playwright/test';
import { assertLogMessage, startRecordLogs} from './utils/log';
import { login } from './utils/roles';
import {publicTestMapUrl} from "./utils/urls";

test.describe('Module', () => {
  test('loading should work out of the box', async ({ page }, { project }) => {
    // Skip test for mobile device
    if(project.name === "mobilechromium") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }

    startRecordLogs(page);
    await page.goto(
      publicTestMapUrl("tests/Modules/with_modules.json", "modules")
    );

    await login(page, 'Alice', 2);

    await assertLogMessage(page, 'Successfully loaded module: foo =  bar');
  });
});
