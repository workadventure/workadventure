// Logs test users in like tests/utils/auth.ts createUser and saves tests/.auth/<name>.json, which createUser then
// reuses for an hour. The difference: it waits for the camera stream before clicking "Save". createUser clicks at
// once, and EnableCameraScene.submit() saves the device ids only once getUserMedia has resolved, so on a fast local
// stack users arrive with camera and microphone off and every spec fails on the mic "bg-danger" check.
// Usage, from tests/: eval "$(../dev/dev env ts)" && node ../dev/warm-auth.mjs Alice Bob [Admin1...]
import { chromium, devices } from "playwright";

const playUrl = process.env.PLAY_URL;
const mapsDomain = process.env.MAPS_DOMAIN;
if (!playUrl || !mapsDomain) throw new Error('Run eval "$(dev/dev env <stack>)" first');

// The OIDC account createUser logs each name in with (tests/tests/utils/auth.ts and oidc.ts), then Matrix SSO.
// Other names stay anonymous, as in createUser.
const oidcAccount = {
    Admin1: "User1",
    Admin2: "User1",
    Member1: "User2",
    UserMatrix: "UserMatrix",
    UserMatrix2: "UserMatrix2",
    UserLogin1: "User1",
};

const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
for (const name of process.argv.slice(2)) {
    const context = await browser.newContext({
        ...devices["Desktop Chrome"],
        permissions: ["microphone", "camera", "notifications"],
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60_000);
    await page.goto(new URL(`/_/warm-auth/${mapsDomain}/tests/E2E/empty.json`, playUrl).toString());
    await page.getByTestId("loginSceneNameInput").fill(name);
    await page.getByTestId("loginSceneNameInput").press("Enter");
    // Same woka as createUser (selectWoka).
    const woka = [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 10;
    for (let i = 0; i < woka; i++) await page.keyboard.press("ArrowRight");
    await page.click("button.selectCharacterSceneFormSubmit");
    await page.locator("video").first().waitFor();
    await page.waitForTimeout(1000);
    await page.click("text=Save");
    await page.getByTestId("microphone-button").waitFor();
    const account = oidcAccount[name];
    if (account) {
        await page.getByRole("button", { name: "Login" }).click();
        await page.fill("#Input_Username", account);
        await page.fill("#Input_Password", "pwd");
        await page.click('button:has-text("Login")');
        await page.locator("#main-layout").waitFor({ timeout: 90_000 });
    }
    const micClass = (await page.getByTestId("microphone-button").getAttribute("class")) ?? "";
    console.log(name, micClass.includes("bg-danger") ? "microphone OFF" : "ok");
    await context.storageState({ path: `./.auth/${name}.json` });
    await context.close();
}
await browser.close();
