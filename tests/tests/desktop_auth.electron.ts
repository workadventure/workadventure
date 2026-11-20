import { expect, test } from "@playwright/test";
import { play_url, publicTestMapUrl } from "./utils/urls";
import { logIn } from "./utils/auth";
import Menu from "./utils/menu";
import { getWorldPage, interceptSystemBrowser, launchDesktopApp, nextSystemBrowserUrl } from "./utils/desktop";

// The page the browser hands back to the app on (desktop window.ts): the app's loopback server.
const loopbackCallback = (kind: "auth" | "logout") => new RegExp(`^http://127\\.0\\.0\\.1:\\d+/${kind}/callback/`);
const inWorld = new RegExp(`^${play_url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);

test("signs in and out through the system browser, which never enters the world @oidc", async ({ browser }) => {
    await using app = await launchDesktopApp(publicTestMapUrl("tests/E2E/empty.json", "desktop_auth"));
    await interceptSystemBrowser(app);
    const world = await getWorldPage(app);
    await logIn(world, "Alice");
    // The user's own browser: the identity provider's session lives there, not in the app.
    await using systemBrowser = await browser.newContext();
    const tab = await systemBrowser.newPage();

    await test.step("sign in", async () => {
        await world.getByRole("button", { name: "Login" }).click();
        const signIn = new URL(await nextSystemBrowserUrl(app));
        expect(signIn.pathname).toBe("/login-screen");
        expect(signIn.searchParams.get("desktopCallbackUrl")).toMatch(loopbackCallback("auth"));

        await tab.goto(signIn.toString());
        await tab.fill("#Input_Username", "User1");
        await tab.fill("#Input_Password", "pwd");
        await tab.click('button:has-text("Login")');
        await expect(tab).toHaveURL(loopbackCallback("auth"));

        await expect(world).toHaveURL(inWorld);
        await Menu.openMenu(world);
        await expect(world.getByRole("button", { name: "Log out" })).toBeVisible();
    });

    await test.step("sign out", async () => {
        await world.getByRole("button", { name: "Log out" }).click();
        const signOut = new URL(await nextSystemBrowserUrl(app));
        expect(signOut.pathname).toBe("/logout");
        expect(signOut.searchParams.get("desktopCallbackUrl")).toMatch(loopbackCallback("logout"));
        // The world the user signed out of is disconnected: the app must not stay on it.
        await expect(world).not.toHaveURL(inWorld);

        await tab.goto(signOut.toString());
        await expect(tab).toHaveURL(loopbackCallback("logout"));

        // Back in the world in the app, as a guest. The browser stays on the "signed out" page.
        await expect(world.getByRole("button", { name: "Login" })).toBeVisible({ timeout: 60_000 });
        await expect(world).toHaveURL(inWorld);
        await expect(tab).toHaveURL(loopbackCallback("logout"));
    });
});
