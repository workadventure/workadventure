import { expect, test } from "@playwright/test";
import { play_url, publicTestMapUrl } from "./utils/urls";
import { logIn } from "./utils/auth";
import Menu from "./utils/menu";
import { getWorldPage, launchDesktopApp } from "./utils/desktop";

// The page the browser hands back to the app on (desktop window.ts): the app's loopback server.
const loopbackCallback = (kind: "auth" | "logout") => new RegExp(`^http://127\\.0\\.0\\.1:\\d+/${kind}/callback/`);
const inWorld = new RegExp(`^${play_url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);

test("signs in and out through the system browser, which never enters the world @oidc", async ({ browser }) => {
    await using app = await launchDesktopApp(publicTestMapUrl("tests/E2E/empty.json", "desktop_auth"), browser);
    const world = await getWorldPage(app);
    await logIn(world, "Alice");

    await test.step("sign in", async () => {
        await world.getByRole("button", { name: "Login" }).click();
        const signIn = await app.waitForSystemBrowserPage();
        await signIn.fill("#Input_Username", "User1");
        await signIn.fill("#Input_Password", "pwd");
        await signIn.click('button:has-text("Login")');
        // Through Synapse's SSO first: its first login of User1 can take 20 s on CI (as in oidcLogin).
        await expect(signIn).toHaveURL(loopbackCallback("auth"), { timeout: 50_000 });

        await expect(world).toHaveURL(inWorld);
        await Menu.openMenu(world);
        await expect(world.getByRole("button", { name: "Log out" })).toBeVisible();
    });

    await test.step("sign out", async () => {
        await world.getByRole("button", { name: "Log out" }).click();
        // The world the user signed out of is disconnected: the app must not stay on it.
        await expect(world).not.toHaveURL(inWorld);

        const signOut = await app.waitForSystemBrowserPage();
        await expect(signOut).toHaveURL(loopbackCallback("logout"));

        // Back in the world in the app, as a guest. The browser stays on the "signed out" page.
        await expect(world.getByRole("button", { name: "Login" })).toBeVisible({ timeout: 60_000 });
        await expect(world).toHaveURL(inWorld);
        await expect(signOut).toHaveURL(loopbackCallback("logout"));
    });
});
