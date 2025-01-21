import { test } from '@playwright/test';
import { assertLogMessage, startRecordLogs} from './utils/log';
import { getPage } from './utils/auth';
import {publicTestMapUrl} from "./utils/urls";

test.describe('Module', () => {
  test('loading should work out of the box', async ({ browser }, { project }) => {
    // Skip test for mobile device
    if(project.name === "mobilechromium") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }
    const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/Modules/with_modules.json", "modules"));
    startRecordLogs(page);

    await assertLogMessage(page, 'Successfully loaded module: foo =  bar');
  });
});
