import { expect, test, type Browser, type Page } from "@playwright/test";
import { chromium, firefox, webkit, type BrowserType } from "playwright-core";
import Map from "./utils/map";
import { getPage } from "./utils/auth";
import { evaluateScript } from "./utils/scripting";
import { expectWebRtcConnectionsCountToBe } from "./utils/webRtc";
import { play_url, publicTestMapUrl } from "./utils/urls";

/**
 * Which codec each side of a P2P bubble ends up encoding, read from the "video quality statistics" box of the
 * local tile. Bob's browser is chosen with BOB_BROWSER (chromium | firefox | webkit) so the codec negotiation
 * can be checked across engines: WebKit has no codec selection API and goes through the exclusive path.
 */
// Any map with a spawn point; CODEC_TEST_MAP_URL points at a public one when running against a deployment
const MAP_URL = process.env.CODEC_TEST_MAP_URL ?? publicTestMapUrl("tests/E2E/empty.json", "codec-e2e");
const BOB_BROWSER = process.env.BOB_BROWSER ?? "chromium";

// Turns the statistics box on before the page loads; a canvas stands in for the webcam where there is none
const prepare = async (page: Page) => {
    await page.addInitScript(() => {
        localStorage.setItem("displayVideoQualityStats", "true");
        if (!navigator.mediaDevices) return;
        const devices = navigator.mediaDevices;
        const originalGetUserMedia = devices.getUserMedia.bind(devices);
        const fakeStream = (): MediaStream => {
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 360;
            const context = canvas.getContext("2d");
            if (!context) throw new Error("No 2D context");
            setInterval(() => {
                context.fillStyle =
                    "#" +
                    Math.floor(Math.random() * 0xffffff)
                        .toString(16)
                        .padStart(6, "0");
                context.fillRect(Math.random() * 600, Math.random() * 320, 40, 40);
            }, 40);
            return canvas.captureStream(15);
        };
        devices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
            try {
                return await originalGetUserMedia(constraints);
            } catch {
                const stream = fakeStream();
                if (constraints?.audio) {
                    const audio = new AudioContext();
                    const destination = audio.createMediaStreamDestination();
                    const oscillator = audio.createOscillator();
                    oscillator.connect(destination);
                    oscillator.start();
                    destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
                }
                return stream;
            }
        };
        const originalEnumerate = devices.enumerateDevices.bind(devices);
        devices.enumerateDevices = async () => {
            const real = await originalEnumerate();
            if (real.some((device) => device.kind === "videoinput")) return real;
            const fake = (kind: MediaDeviceKind, label: string) =>
                ({ kind, label, deviceId: kind, groupId: "fake", toJSON: () => ({}) }) as MediaDeviceInfo;
            return [...real, fake("videoinput", "Fake camera"), fake("audioinput", "Fake microphone")];
        };
    });
};

// The test runner stores the Chromium project's launch flags and context options (camera permissions...) on the
// shared Playwright object, and every browser type applies them; Firefox and WebKit reject them. They are cleared
// while Bob's browser and pages are created, and restored afterwards for Alice's Chromium.
async function withoutProjectDefaults<T>(type: BrowserType, run: () => Promise<T>): Promise<T> {
    const playwright = (type as unknown as { _playwright: Record<string, unknown> })._playwright;
    const saved = { launch: playwright._defaultLaunchOptions, context: playwright._defaultContextOptions };
    playwright._defaultLaunchOptions = undefined;
    playwright._defaultContextOptions = undefined;
    try {
        return await run();
    } finally {
        playwright._defaultLaunchOptions = saved.launch;
        playwright._defaultContextOptions = saved.context;
    }
}

async function launchBob(): Promise<Browser> {
    switch (BOB_BROWSER) {
        case "webkit":
            return webkit.launch();
        case "firefox":
            return firefox.launch({
                firefoxUserPrefs: {
                    "media.navigator.streams.fake": true,
                    "permissions.default.microphone": 1,
                    "permissions.default.camera": 1,
                },
            });
        default:
            return chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
    }
}

async function sentCodec(page: Page): Promise<string> {
    const box = page.getByTestId("encoder-stats").first();
    await expect(box).toBeVisible({ timeout: 60_000 });
    // The cells of the box run together in textContent ("Codec:video/VP9Source:...")
    const codecOf = async () => ((await box.textContent()) ?? "").match(/Codec:\s*video\/(av1|vp9|vp8|h264)/i)?.[1];
    await expect.poll(codecOf, { timeout: 30_000 }).toBeTruthy();
    const codec = await codecOf();
    if (!codec) throw new Error("No codec displayed");
    return "video/" + codec.toLowerCase();
}

test.describe("P2P video codecs @nomobile", () => {
    test.beforeEach("Alice runs in Chromium; Bob's browser is chosen with BOB_BROWSER", ({ browserName }) => {
        if (browserName !== "chromium") {
            test.skip();
            return;
        }
    });

    test(`codec negotiated between Chrome and ${BOB_BROWSER}`, async ({ browser }) => {
        test.setTimeout(300_000);
        await using alice = await getPage(browser, "Alice", new URL(MAP_URL, play_url).toString(), {
            pageCreatedHook: prepare,
        });
        const bobType = { webkit, firefox }[BOB_BROWSER] ?? chromium;
        const bobBrowser = await withoutProjectDefaults(bobType, launchBob);
        try {
            await using bob = await withoutProjectDefaults(bobType, () =>
                getPage(bobBrowser, "Bob", new URL(MAP_URL, play_url).toString(), { pageCreatedHook: prepare }),
            );

            const position = await evaluateScript(alice, async () => WA.player.getPosition());
            await Map.teleportToPosition(bob, position.x, position.y);

            await expect(alice.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 60_000 });
            await expectWebRtcConnectionsCountToBe(alice, 1, 30_000);
            await expectWebRtcConnectionsCountToBe(bob, 1, 30_000);

            const [aliceSends, bobSends] = await Promise.all([sentCodec(alice), sentCodec(bob)]);
            console.log(`Alice (chromium) sends ${aliceSends}, Bob (${BOB_BROWSER}) sends ${bobSends}`);

            // Nobody may encode what we never ask for: VP8 (software everywhere) or AV1 for a camera
            expect(["video/vp9", "video/h264"]).toContain(aliceSends);
            expect(["video/vp9", "video/h264"]).toContain(bobSends);
            // Two desktops that can both encode VP9 and honour each other's order land on VP9. Linux WebKit's
            // GStreamer backend picks its own codec, so only the membership above is checked there.
            const vp9Pair = ["video/vp9", "video/vp9"];
            expect(BOB_BROWSER === "webkit" ? vp9Pair : [aliceSends, bobSends]).toEqual(vp9Pair);
        } finally {
            await bobBrowser.close();
        }
    });
});
