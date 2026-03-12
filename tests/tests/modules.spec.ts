import { test } from "@playwright/test";
import { assertLogMessage, startRecordLogs } from "./utils/log.ts";
import { getPage } from "./utils/auth.ts";
import { publicTestMapUrl } from "./utils/urls.ts";
import { isMobile } from "./utils/isMobile.ts";

test.describe("Module @nomobile", () => {
    test.beforeEach(async ({ page }) => {
        test.skip(isMobile(page), "Skip on mobile devices");
    });
    test("loading should work out of the box", async ({ browser }, { project }) => {
        await using page = await getPage(
            browser,
            "Alice",
            publicTestMapUrl("tests/Modules/with_modules.json", "modules"),
            {
                pageCreatedHook: (page) => {
                    startRecordLogs(page);
                },
            },
        );
        await assertLogMessage(page, "Successfully loaded module: foo =  bar");
    });
});
