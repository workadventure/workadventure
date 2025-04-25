import { test } from '@playwright/test';
import { assertLogMessage, startRecordLogs} from './utils/log';
import { getPage } from './utils/auth';
import {publicTestMapUrl} from "./utils/urls";
import {isMobile} from "./utils/isMobile";

test.describe('Module', () => {
    test.beforeEach(async ({ page }) => {
        if (isMobile(page)) {
            //eslint-disable-next-line playwright/no-skipped-test
            test.skip();
        }
    });
  test('loading should work out of the box', async ({ browser }, { project }) => {
    const page = await getPage(browser, 'Alice', publicTestMapUrl("tests/Modules/with_modules.json", "modules"),
        {
          pageCreatedHook: (page) => {
            startRecordLogs(page);
          }
        });
    await assertLogMessage(page, 'Successfully loaded module: foo =  bar');
  });
});
