import { expect, test } from "@playwright/test";
import { maps_test_url, publicTestMapUrl } from "./utils/urls";
import { logIn } from "./utils/auth";
import { evaluateScript } from "./utils/scripting";
import { getWorldPage, launchDesktopApp } from "./utils/desktop";

test("an iframe its server sends to the administration stays in the app", async ({ browser }) => {
    await using app = await launchDesktopApp(publicTestMapUrl("tests/E2E/empty.json", "desktop_navigation"), browser);
    const world = await getWorldPage(app);
    await logIn(world, "Alice");

    // Like the Profile menu's iframe, which the pusher redirects to the administration: the app opens the
    // administration in the browser when the world page itself goes there, not when an iframe does.
    await evaluateScript(
        world,
        async (url) => {
            await WA.nav.openCoWebSite(url);
        },
        maps_test_url + "E2E/redirect_to_administration.php",
    );

    await expect
        .poll(() => world.frames().map((frame) => frame.url()))
        .toContain("http://admin.workadventure.localhost/profile");
});
