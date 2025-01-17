import fs from 'fs';
import { Browser, BrowserContext, expect, Page } from 'playwright/test';
import { publicTestMapUrl } from "./urls";

const characterNumber = 3;

function isJsonCreate(name: string): boolean {

    const file: string = './.auth/' + name + '.json'
    if (!fs.existsSync(file)) {
        return false;
    }
    const date: Date = new Date();
    const timeCreate: number = date.getMilliseconds() - fs.statSync(file).birthtime.getMilliseconds();
    return timeCreate <= 7200000; // 7 200 000 ms = 2 hours
}

async function createUser(name='Alice', browser: Browser): Promise<void> {
    
    if(isJsonCreate(name)) {
        return;
    }

    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();
    
    await page.goto(
        publicTestMapUrl(`tests/RemotePlayers/remote_players.json`, "setup")
    );
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

    await page.context().storageState({ path: './.auth/' + name + '.json'})

    await page.close();
    await context.close();
}

export async function getPage(browser: Browser, name: string, url:string): Promise<Page> {
    await createUser(name, browser);
    const newBrowser: BrowserContext = await browser.newContext({ storageState: './.auth/' + name + '.json' });
    const page: Page = await newBrowser.newPage();
    await page.goto(url);
    return page;
}