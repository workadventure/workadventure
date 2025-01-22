import fs from 'fs';
import { Browser, BrowserContext, expect, Page } from 'playwright/test';
import { oidcAdminTagLogin, oidcMatrixUserLogin, oidcMemberTagLogin, oidcLogin } from './oidc';
import { gotoWait200} from "./containers";
import Menu from "./menu";
import {play_url} from "./urls";

const characterNumber = 3;

function isJsonCreate(name: string): boolean {

    const file: string = './.auth/' + name + '.json'
    if (!fs.existsSync(file)) {
        return false;
    }

    const stats = fs.statSync(file);
    const timeCreation: number = stats.mtime.getTime();
    const twoHoursAgo: number = new Date().getTime() - 2 * 60 * 60 * 1000; // 2 hours in ms
    return timeCreation > twoHoursAgo;
}

async function createUser(
    name: "Alice" | "Bob" | "Admin1" | "Admin2" | "Member1" | "UserMatrix" | "UserLogin1" | "John" | "UserMatrix2",
    browser: Browser, url: string): Promise<void> {
    
    if(isJsonCreate(name)) {
        return;
    }
    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();
    const targetUrl = new URL(url, play_url).toString();

    await page.goto(targetUrl);

    // login
    await page.fill('input[name="loginSceneName"]', name);
    await page.click('button.loginSceneFormSubmit');
    await expect(page.locator('button.selectCharacterSceneFormSubmit')).toBeVisible();
    for (let i = 0; i < characterNumber; i++) {
        await page.keyboard.press('ArrowRight');
    }
    await page.click('button.selectCharacterSceneFormSubmit');

    // selectMedia
    await expect(page.locator('h2', { hasText: "Turn on your camera and microphone" })).toBeVisible();
    await page.click("text=Save");

    await Menu.expectButtonState(page, "microphone-button", 'normal');

    switch (name) {
        case "Admin1":
        case "Admin2":
            await oidcAdminTagLogin(page, false);    
            break;
        case "Member1":
            await oidcMemberTagLogin(page, false);
            break;
        case "UserMatrix":
        case "UserMatrix2":
            await oidcMatrixUserLogin(page, false);
            break;
        case "UserLogin1":
            await oidcLogin(page);
            break;
        default:
            break;
    }

    await page.context().storageState({ path: './.auth/' + name + '.json'})

    await page.close();
    await context.close();
}



export async function getPage(browser: Browser,
      name: "Alice" | "Bob" | "Admin1" | "Admin2" | "Member1" | "UserMatrix" | "UserLogin1" | "John" | "UserMatrix2",
      url:string,
      options: {
    pageCreatedHook?: (page: Page) => void,
      } = {}): Promise<Page> {
    await createUser(name, browser, url);
    const newBrowser: BrowserContext = await browser.newContext({ storageState: './.auth/' + name + '.json' });
    const page: Page = await newBrowser.newPage();
    if(options.pageCreatedHook) {
        options.pageCreatedHook(page);
    }
    await page.goto(url);
    await expect(page.getByTestId('microphone-button')).toBeVisible({ timeout: 15_000 });
    return page;
}

export async function getPageWait200(browser: Browser,
        name: "Alice" | "Bob" | "Admin1" | "Admin2" | "Member1" | "UserMatrix" | "UserLogin1" | "John",
        url:string): Promise<Page> {
    await createUser(name, browser, url);
    const newBrowser: BrowserContext = await browser.newContext({ storageState: './.auth/' + name + '.json' });
    const page: Page = await newBrowser.newPage();
    await gotoWait200(page, url);
    await expect(page.getByTestId('microphone-button')).toBeVisible({ timeout: 40_000 });
    return page;
}
