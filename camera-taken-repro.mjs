// Reproduces "neither camera nor microphone" after another application used the camera (Windows behavior):
//  1. Alice is in a bubble with Bob, camera and microphone on.
//  2. Bob leaves: out of a bubble and idle, WorkAdventure releases Alice's camera and microphone.
//  3. Another application takes the camera. On Windows a busy camera fails getUserMedia with NotReadableError
//     ("Could not start video source"), which this page simulates.
//  4. Bob comes back: the bubble forms again, WorkAdventure asks for her camera and microphone, it fails.
//  5. Bob leaves, the other application releases the camera, Bob comes back.
// Bob leaves the page and opens it again: he appears at the start point, next to Alice who does not move, so the
// bubble comes and goes the same way every time (walking on the map hit walls and doors).
// Records, at each step, Alice's camera and microphone buttons, the getUserMedia calls and their outcome, what Bob
// gets from her, with screenshots.
//
// Usage, from workadventure-saas/tests:  LABEL=prod node camera-taken-repro.mjs <room url> <out dir>
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const [url, outDir] = process.argv.slice(2);
if (!url || !outDir) {
    console.error("Usage: node camera-taken-repro.mjs <room url> <out dir>");
    process.exit(1);
}
const LABEL = process.env.LABEL ?? "run";
const IDLE_MS = Number(process.env.IDLE_MS ?? 15_000);
const dir = `${outDir}/${LABEL}`;
mkdirSync(dir, { recursive: true });
const t0 = Date.now();
const stamp = () => `${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s`;

const browser = await chromium.launch({
    headless: process.env.HEADED !== "1",
    channel: process.env.CHANNEL ?? "chrome",
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
});

function installCameraHook() {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    let taken = false;
    window.__gum = [];
    window.__tracks = [];
    navigator.mediaDevices.getUserMedia = async (constraints) => {
        const call = { at: Math.round(performance.now() / 100) / 10, video: !!constraints?.video, audio: !!constraints?.audio };
        window.__gum.push(call);
        if (taken && constraints?.video) {
            call.result = "NotReadableError";
            throw new DOMException("Could not start video source", "NotReadableError");
        }
        const stream = await original(constraints);
        call.result = "ok";
        window.__tracks.push(...stream.getTracks());
        return stream;
    };
    window.__takeCamera = () => {
        taken = true;
    };
    window.__releaseCamera = () => {
        taken = false;
    };
    window.__liveTracks = () =>
        window.__tracks.filter((t) => t.readyState === "live").map((t) => t.kind).sort().join("+") || "none";
}

async function enter(page, name) {
    await page.goto("about:blank");
    await page.goto(url, { timeout: 120_000, waitUntil: "domcontentloaded" });
    const deadline = Date.now() + 180_000;
    while (!(await page.getByTestId("microphone-button").isVisible().catch(() => false))) {
        if (Date.now() > deadline) throw new Error(`${name} never reached the map`);
        const nameInput = page.getByTestId("loginSceneNameInput");
        if (await nameInput.isVisible().catch(() => false)) {
            await nameInput.fill(name);
            await nameInput.press("Enter");
        }
        const woka = page.locator("button.selectCharacterSceneFormSubmit");
        if (await woka.isVisible().catch(() => false)) await woka.click().catch(() => undefined);
        const save = page.getByRole("button", { name: "Save" });
        if (await save.isVisible().catch(() => false)) await save.click().catch(() => undefined);
        await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(2000);
    for (const id of ["camera-button", "microphone-button"]) {
        const button = page.getByTestId(id);
        if ((await button.getAttribute("class"))?.includes("bg-danger")) await button.click({ force: true });
    }
}

async function join(name, hook) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "en-US" });
    const page = await context.newPage();
    if (hook) await page.addInitScript(installCameraHook);
    await enter(page, name);
    console.log(`${stamp()} ${name} is on the map`);
    return page;
}

async function leave(page) {
    await page.goto("about:blank");
}

const alice = await join("Alice", true);
const bob = await join("Bob", false);

const state = async () => ({
    aliceCamera: await alice.evaluate(() =>
        (document.querySelector('[data-testid="camera-button"]')?.className ?? "").includes("bg-danger") ? "off" : "on",
    ),
    aliceMicrophone: await alice.evaluate(() =>
        (document.querySelector('[data-testid="microphone-button"]')?.className ?? "").includes("bg-danger") ? "off" : "on",
    ),
    aliceLiveTracks: await alice.evaluate(() => window.__liveTracks()),
    inBubble: await alice.locator("#cameras-container").getByText("Bob").first().isVisible().catch(() => false),
    bobSeesAlice: await bob.locator("#cameras-container").getByText("Alice").first().isVisible().catch(() => false),
    gum: await alice.evaluate(() => window.__gum.map((c) => `${c.video ? "V" : ""}${c.audio ? "A" : ""}:${c.result ?? "pending"}`).join(" ")),
});
const steps = [];
async function record(step) {
    const s = await state();
    steps.push({ step, ...s });
    console.log(`${stamp()} ${step}: ${JSON.stringify(s)}`);
    const slug = step.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    await alice.screenshot({ path: `${dir}/${steps.length}-alice-${slug}.png` });
    await bob.screenshot({ path: `${dir}/${steps.length}-bob-${slug}.png` });
}

await alice.waitForTimeout(8000);
await record("1 in the bubble");

await leave(bob);
await alice.waitForTimeout(IDLE_MS);
await record("2 out of the bubble, idle");

await alice.evaluate(() => window.__takeCamera());
await enter(bob, "Bob");
await alice.waitForTimeout(10_000);
await record("3 camera taken by another app, back in the bubble");

await leave(bob);
await alice.waitForTimeout(IDLE_MS);
await alice.evaluate(() => window.__releaseCamera());
await record("4 out of the bubble, other app released the camera");

await enter(bob, "Bob");
await alice.waitForTimeout(10_000);
await record("5 back in the bubble");

writeFileSync(`${dir}/summary.json`, JSON.stringify({ label: LABEL, url, steps }, null, 2));
await browser.close();
