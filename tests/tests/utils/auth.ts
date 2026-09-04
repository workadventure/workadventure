import fs from "fs";
import type { Browser, BrowserContext, Page } from "playwright/test";
import { expect } from "playwright/test";
import { oidcAdminTagLogin, oidcMatrixUserLogin, oidcMemberTagLogin, oidcLogin } from "./oidc";
import Menu from "./menu";
import { play_url } from "./urls";
import { dismissPwaInstallScreenIfShown } from "./pwaInstall";
import { dismissDuplicateUserConnectedModalIfShown } from "./duplicateUserModal";
import { dismissNoBrowserSoundInfoToast } from "./doNotDisturbInfoToast";

/**
 * `getPage()` gives every page its own browser context, and nothing else ever closes those
 * contexts, so `page.close()` has to close the context too or it leaks for the rest of the worker.
 *
 * Closing the context is enough on its own: juggler's `BrowserContext.destroy()` already closes
 * every page of the context and waits for each `TargetDestroyed`. Closing the page first only adds
 * a second, redundant teardown of the same tab — and because juggler drops a page from
 * `context.pages` on the async `TabClose` event, that second close can land on a window Firefox has
 * already stopped tracking, which is where Firefox 153 throws
 * `Browser.removeBrowserContext ... can't access property "_maybeDontRestoreTabs"`.
 *
 * `Page` already implements `Symbol.asyncDispose` as `close()`, so patching `close` is all it takes
 * for `await using page = await getPage(...)` to tear the context down as well.
 */
function disposeWithContext(page: Page): Page {
    const context = page.context();
    let closePromise: Promise<void> | undefined;

    const closeContext = async () => {
        try {
            await context.close();
        } catch (e) {
            if (e instanceof Error && e.message.includes("has been closed")) {
                return;
            }
            throw e;
        }
    };

    page.close = () => {
        closePromise ??= closeContext();
        return closePromise;
    };

    return page;
}

function selectWoka(name: string): number {
    let res = 0;
    for (let i = 0; i < name.length; i++) {
        res += name.charCodeAt(i);
    }
    return res % 10;
}

function isJsonCreate(name: string): boolean {
    const file: string = "./.auth/" + name + ".json";
    if (!fs.existsSync(file)) {
        return false;
    }

    const stats = fs.statSync(file);
    const timeCreation = stats.mtime.getTime();
    const twoHoursAgo = new Date().getTime() - 60 * 60 * 1000; // 1 hour in ms
    return timeCreation > twoHoursAgo;
}

async function createUser(
    name:
        | "Alice"
        | "Bob"
        | "Eve"
        | "Mallory"
        | "Admin1"
        | "Admin2"
        | "Member1"
        | "UserMatrix"
        | "UserLogin1"
        | "John"
        | "UserMatrix2"
        | "User1",
    browser: Browser,
    url: string,
): Promise<void> {
    if (isJsonCreate(name)) {
        return;
    }
    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();
    const targetUrl = new URL(url, play_url).toString();

    await page.goto(targetUrl);

    // login
    const loginSceneNameInput = page.getByTestId("loginSceneNameInput");
    const loginSubmitButton = page.locator("button.loginSceneFormSubmit");

    await loginSceneNameInput.fill(name);
    await expect(loginSubmitButton).toBeVisible();
    await loginSceneNameInput.press("Enter");

    await expect(page.locator("button.selectCharacterSceneFormSubmit")).toBeVisible();
    for (let i = 0; i < selectWoka(name); i++) {
        await page.keyboard.press("ArrowRight");
    }
    await page.click("button.selectCharacterSceneFormSubmit");

    // selectMedia
    await expect(page.locator("h2", { hasText: "Turn on your camera and microphone" })).toBeVisible();
    await page.click("text=Save");

    await dismissDuplicateUserConnectedModalIfShown(page);
    await dismissPwaInstallScreenIfShown(page);
    await dismissNoBrowserSoundInfoToast(page);
    await skipOnboardingWhenShown(page);

    if (browser.browserType().name() !== "webkit") {
        await Menu.expectButtonState(page, "microphone-button", "normal");
        await Menu.expectButtonState(page, "camera-button", "normal");
    } else {
        await Menu.expectButtonState(page, "microphone-button", "forbidden");
        await Menu.expectButtonState(page, "camera-button", "forbidden");
    }

    switch (name) {
        case "Admin1":
        case "Admin2":
            await oidcAdminTagLogin(page);
            break;
        case "Member1":
            await oidcMemberTagLogin(page);
            break;
        case "UserMatrix":
            await oidcMatrixUserLogin(page);
            break;
        case "UserMatrix2":
            await oidcMatrixUserLogin(page, "UserMatrix2");
            break;
        case "UserLogin1":
            await oidcLogin(page);
            break;
        default:
            break;
    }

    await page.context().storageState({ path: "./.auth/" + name + ".json" });

    // Closing the context closes its pages; closing the page first is the redundant second teardown
    // that Firefox 153 chokes on. See `disposeWithContext`.
    await context.close();
}

export async function getPage(
    browser: Browser,
    name:
        | "Alice"
        | "Bob"
        | "Eve"
        | "Mallory"
        | "Admin1"
        | "Admin2"
        | "Member1"
        | "UserMatrix"
        | "UserLogin1"
        | "John"
        | "UserMatrix2"
        | "User1",
    url: string,
    options: {
        pageCreatedHook?: (page: Page) => void | Promise<void>;
    } = {},
): Promise<Page> {
    await createUser(name, browser, url);
    const newBrowser: BrowserContext = await browser.newContext({ storageState: "./.auth/" + name + ".json" });
    const page: Page = await newBrowser.newPage();
    if (options.pageCreatedHook) {
        await options.pageCreatedHook(page);
    }
    const targetUrl = new URL(url, play_url).toString();
    await page.goto(targetUrl);
    await dismissPwaInstallScreenIfShown(page, true);
    await dismissDuplicateUserConnectedModalIfShown(page, true);
    await dismissNoBrowserSoundInfoToast(page);
    await skipOnboardingWhenShown(page);

    await expect(page.getByTestId("microphone-button")).toBeVisible({ timeout: 120_000 });
    return disposeWithContext(page);
}

async function skipOnboardingWhenShown(page: Page) {
    await page.addLocatorHandler(page.getByTestId("onboarding-button-welcome-skip"), async () => {
        try {
            await page.getByTestId("onboarding-button-welcome-skip").click();
        } catch (e) {
            if (e instanceof Error && e.message.includes("Target page, context or browser has been closed")) {
                return;
            }
            throw e;
        }
    });
}
