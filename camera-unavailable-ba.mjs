// Before/after of #6792: Alice's camera is held back (frozen track, every later getUserMedia for video hangs), as
// when a session is locked or the system keeps the camera. Records what Alice and Bob see, with screenshots.
//
// Usage, from workadventure-saas/tests:  LABEL=before node camera-unavailable-ba.mjs <room url> <out dir>
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const [url, outDir] = process.argv.slice(2);
if (!url || !outDir) {
    console.error("Usage: node camera-unavailable-ba.mjs <room url> <out dir>");
    process.exit(1);
}
const LABEL = process.env.LABEL ?? "run";
// 4 on a test environment (MAX_USERS_FOR_WEBRTC=3) puts the bubble on LiveKit
const USERS = Number(process.env.USERS ?? 2);
const WATCH_S = Number(process.env.WATCH_S ?? 60);
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
    const cameras = [];
    let heldBack = false;
    window.__gum = { calls: 0, hung: 0 };
    navigator.mediaDevices.getUserMedia = async (constraints) => {
        window.__gum.calls++;
        if (heldBack && constraints?.video) {
            window.__gum.hung++;
            return new Promise(() => undefined);
        }
        const stream = await original(constraints);
        const source = stream.getVideoTracks()[0];
        if (!source) return stream;
        const camera = { frozen: false };
        cameras.push(camera);
        const generator = new MediaStreamTrackGenerator({ kind: "video" });
        new MediaStreamTrackProcessor({ track: source }).readable
            .pipeThrough(new TransformStream({ transform(frame, c) { camera.frozen ? frame.close() : c.enqueue(frame); } }))
            .pipeTo(generator.writable)
            .catch(() => undefined);
        const stop = generator.stop.bind(generator);
        generator.stop = () => { source.stop(); stop(); };
        return new MediaStream([generator, ...stream.getAudioTracks()]);
    };
    // LiveKit's signal connection goes to /rtc
    const NativeWebSocket = window.WebSocket;
    window.__livekit = false;
    window.WebSocket = class extends NativeWebSocket {
        constructor(url, protocols) {
            super(url, protocols);
            if (String(url).includes("/rtc")) window.__livekit = true;
        }
    };
    window.__holdCameraBack = () => { heldBack = true; cameras.forEach((c) => (c.frozen = true)); };
    window.__releaseCamera = () => { heldBack = false; };
    // FREEZE_ONLY: the camera freezes once, asking for it again gives a working one
    window.__freezeCamera = () => { cameras.forEach((c) => (c.frozen = true)); };
    const getStats = RTCPeerConnection.prototype.getStats;
    RTCPeerConnection.prototype.getStats = async function (...args) {
        const report = await getStats.apply(this, args);
        report.forEach((s) => {
            if (s.type === "outbound-rtp" && s.kind === "video" && s.active) window.__sending = true;
        });
        return report;
    };
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
    // The camera only: a fake microphone that stays silent brings the "no sound" toast over the tiles
    for (const id of ["camera-button"]) {
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

const alice = await join("Alice", true);
const stallWarnings = [];
alice.on("console", (msg) => {
    const text = msg.text();
    if (text.startsWith("The camera ")) {
        stallWarnings.push(`${stamp()} ${text}`);
        console.log(`${stamp()} [alice] ${text}`);
    }
});
const bob = await join("Bob", false);
const others = [];
for (const name of ["Carol", "Dave", "Eve"].slice(0, Math.max(0, USERS - 2))) {
    others.push(await join(name, false));
}

const deadline = Date.now() + 90_000;
while (!(await alice.evaluate((livekit) => window.__sending === true && (!livekit || window.__livekit), USERS >= 4))) {
    if (Date.now() > deadline) {
        console.log(`${stamp()} Alice sends no video: not in a bubble`);
        await browser.close();
        process.exit(2);
    }
    await alice.waitForTimeout(1000);
}
console.log(`${stamp()} Alice sends video, transport: ${(await alice.evaluate(() => window.__livekit)) ? "LiveKit" : "P2P"}`);
await alice.waitForTimeout(10_000);
await alice.screenshot({ path: `${dir}/0-alice-before-freeze.png` });
await bob.screenshot({ path: `${dir}/0-bob-before-freeze.png` });

const state = async () => ({
    aliceButton: await alice.evaluate(() => {
        const c = document.querySelector('[data-testid="camera-button"]')?.className ?? "";
        return c.includes("bg-warning") ? "warning" : c.includes("bg-danger") ? "off (red)" : "on";
    }),
    aliceToast: await alice.getByTestId("camera-no-image-retry").isVisible().catch(() => false),
    bobSeesUnavailable: await bob.getByTestId("camera-unavailable").first().isVisible().catch(() => false),
    bobSeesRed: await bob.getByText("No video stream received.").first().isVisible().catch(() => false),
    gum: await alice.evaluate(() => window.__gum),
    livekit: await alice.evaluate(() => window.__livekit),
});

console.log(`${stamp()} --- holding Alice's camera back ---`);
if (process.env.FREEZE_ONLY === "1") {
    await alice.evaluate(() => window.__freezeCamera());
} else {
    await alice.evaluate(() => window.__holdCameraBack());
}
const timeline = [];
let last = "";
for (let i = 1; i <= WATCH_S; i++) {
    await alice.waitForTimeout(1000);
    const s = await state();
    const key = JSON.stringify({ ...s, gum: undefined });
    if (key !== last) {
        timeline.push({ t: i, ...s });
        console.log(`${stamp()} +${i}s ${JSON.stringify(s)}`);
        last = key;
    }
    if (i === 15) {
        await alice.screenshot({ path: `${dir}/1-alice-15s.png` });
        await bob.screenshot({ path: `${dir}/1-bob-15s.png` });
    }
}
await alice.screenshot({ path: `${dir}/2-alice-${WATCH_S}s.png` });
await bob.screenshot({ path: `${dir}/2-bob-${WATCH_S}s.png` });
const afterWatch = await state();

console.log(`${stamp()} --- camera released, Alice clicks Try again ---`);
await alice.evaluate(() => window.__releaseCamera());
await alice.getByTestId("camera-no-image-retry").click({ timeout: 5_000 }).catch(() => console.log("no Try again button"));
await alice.waitForTimeout(12_000);
await alice.screenshot({ path: `${dir}/3-alice-after-retry.png` });
await bob.screenshot({ path: `${dir}/3-bob-after-retry.png` });
const afterRetry = await state();

const summary = { label: LABEL, url, stallWarnings, timeline, afterWatch, afterRetry };
writeFileSync(`${dir}/summary.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ warnings: stallWarnings.length, afterWatch, afterRetry }, null, 2));
await browser.close();
