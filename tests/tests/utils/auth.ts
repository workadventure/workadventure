import fs from 'fs';
import { Browser, BrowserContext, expect, Page } from 'playwright/test';
import { oidcAdminTagLogin, oidcMatrixUserLogin, oidcMemberTagLogin, oidcLogin } from './oidc';

const characterNumber = 3;

function isJsonCreate(name: string): boolean {

    const file: string = './.auth/' + name + '.json'
    if (!fs.existsSync(file)) {
        return false;
    }
    const date: Date = new Date();
    const timeCreate: number = date.getTime() - fs.statSync(file).birthtime.getTime();
    return timeCreate <= 7200000; // 7 200 000 ms = 2 hours
}

async function createUser(name: "Alice" | "Bob" | "Admin1" | "Admin2" | "Member1" | "UserMatrix" | "UserLogin1",
    browser: Browser, url: string): Promise<void> {
    
    if(isJsonCreate(name)) {
        return;
    }

    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();
    
    await page.goto(url);
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

    await expect(page.locator("div#main-layout").nth(0)).toBeVisible();
    switch (name) {
        case "Admin1":
        case "Admin2":
            await oidcAdminTagLogin(page, false);    
            break;
        case "Member1":
            await oidcMemberTagLogin(page, false);
            break;
        case "UserMatrix":
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
    name: "Alice" | "Bob" | "Admin1" | "Admin2" | "Member1" | "UserMatrix" | "UserLogin1",
     url:string): Promise<Page> {
    await createUser(name, browser, url);
    const newBrowser: BrowserContext = await browser.newContext({ storageState: './.auth/' + name + '.json' });
    const page: Page = await newBrowser.newPage();
    await page.goto(url);
    return page;
}