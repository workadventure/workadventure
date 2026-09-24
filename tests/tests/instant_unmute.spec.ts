import { expect, test, type Page } from "@playwright/test";
import Map from "./utils/map";
import Menu from "./utils/menu";
import { getPage } from "./utils/auth";
import { evaluateScript } from "./utils/scripting";
import { expectLivekitConnectionsCountToBe, expectWebRtcConnectionsCountToBe } from "./utils/webRtc";
import { play_url, publicTestMapUrl } from "./utils/urls";

const MAP_URL = publicTestMapUrl("tests/E2E/empty.json", "instant-unmute");

declare global {
    interface Window {
        __audioCaptureCount: number;
        __capturedAudioTracks: MediaStreamTrack[];
        __peerConnections: RTCPeerConnection[];
    }
}

// Counts the microphone captures and keeps every peer connection, so the test can see what an unmute costs
const instrument = async (page: Page) => {
    await page.addInitScript(() => {
        window.__audioCaptureCount = 0;
        window.__capturedAudioTracks = [];
        window.__peerConnections = [];
        const devices = navigator.mediaDevices;
        const getUserMedia = devices.getUserMedia.bind(devices);
        devices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
            const stream: MediaStream = await getUserMedia(constraints);
            if (constraints?.audio) {
                window.__audioCaptureCount++;
                window.__capturedAudioTracks.push(...stream.getAudioTracks());
            }
            return stream;
        };
        const NativePeerConnection = window.RTCPeerConnection;
        window.RTCPeerConnection = class extends NativePeerConnection {
            constructor(configuration?: RTCConfiguration) {
                super(configuration);
                window.__peerConnections.push(this);
            }
        };
    });
};

const audioCaptureCount = (page: Page) => page.evaluate(() => window.__audioCaptureCount);
const liveCapturedAudioTracks = (page: Page) =>
    page.evaluate(() => window.__capturedAudioTracks.filter((track) => track.readyState === "live").length);

async function sentAudioBytes(page: Page): Promise<number> {
    return page.evaluate(async () => {
        let bytes = 0;
        for (const pc of window.__peerConnections) {
            if (pc.connectionState === "closed") continue;
            (await pc.getStats()).forEach((report: { type: string; kind?: string; bytesSent?: number }) => {
                if (report.type === "outbound-rtp" && report.kind === "audio") bytes += report.bytesSent ?? 0;
            });
        }
        return bytes;
    });
}

// Milliseconds between the click on the microphone button and Alice's audio actually leaving her browser.
// Measured on the sender: in a LiveKit room, Bob also receives packets that are not Alice's voice.
async function unmuteDelay(alice: Page): Promise<number> {
    const before = await sentAudioBytes(alice);
    const clickedAt = Date.now();
    await alice.getByTestId("microphone-button").click();
    await expect.poll(() => sentAudioBytes(alice), { intervals: [20], timeout: 15_000 }).toBeGreaterThan(before + 500);
    return Date.now() - clickedAt;
}

// Mutes and unmutes Alice five times, then mutes her and takes her out of the conversation
async function checkInstantUnmute(alice: Page, leaveConversation: () => Promise<void>): Promise<void> {
    await Menu.turnOnMicrophone(alice);
    await expect.poll(() => liveCapturedAudioTracks(alice), { timeout: 15_000 }).toBe(1);

    const delays: number[] = [];
    for (let i = 0; i < 5; i++) {
        await Menu.turnOffMicrophone(alice);
        // Muted in the conversation: the microphone stays open, disabled
        await expect.poll(() => liveCapturedAudioTracks(alice)).toBe(1);
        const captures = await audioCaptureCount(alice);
        delays.push(await unmuteDelay(alice));
        // ...and unmuting did not reopen it
        expect(await audioCaptureCount(alice)).toBe(captures);
    }
    console.log(`Unmute → Alice's audio sent: ${delays.join(" ms, ")} ms`);

    // Muted, then out of the conversation: the microphone is really released
    await Menu.turnOffMicrophone(alice);
    await leaveConversation();
    await expect.poll(() => liveCapturedAudioTracks(alice), { timeout: 15_000 }).toBe(0);
}

test.describe("Instant unmute @nomobile", () => {
    test.beforeEach(({ browserName }) => {
        test.skip(browserName !== "chromium", "fake microphone flags are set on the Chromium project");
    });

    test("in a P2P bubble", async ({ browser }) => {
        test.setTimeout(180_000);
        const url = new URL(MAP_URL, play_url).toString();
        await using alice = await getPage(browser, "Alice", url, { pageCreatedHook: instrument });
        await using bob = await getPage(browser, "Bob", url, { pageCreatedHook: instrument });

        const position = await evaluateScript(alice, async () => WA.player.getPosition());
        await Map.teleportToPosition(bob, position.x, position.y);
        await expectWebRtcConnectionsCountToBe(alice, 1, 30_000);
        await expectWebRtcConnectionsCountToBe(bob, 1, 30_000);

        await checkInstantUnmute(alice, async () => {
            await Map.teleportToPosition(bob, position.x + 20 * 32, position.y);
            await expectWebRtcConnectionsCountToBe(alice, 0, 30_000);
        });
    });

    test("in a LiveKit bubble", async ({ browser }) => {
        test.setTimeout(240_000);
        const url = new URL(MAP_URL, play_url).toString();
        await using alice = await getPage(browser, "Alice", url, { pageCreatedHook: instrument });
        await using bob = await getPage(browser, "Bob", url, { pageCreatedHook: instrument });
        await using eve = await getPage(browser, "Eve", url);
        await using mallory = await getPage(browser, "Mallory", url);

        const position = await evaluateScript(alice, async () => WA.player.getPosition());
        for (const page of [bob, eve, mallory]) {
            await Map.teleportToPosition(page, position.x, position.y);
        }
        // Past MAX_USERS_FOR_WEBRTC, the bubble switches to LiveKit
        await expectLivekitConnectionsCountToBe(alice, 3, 60_000);
        await expectLivekitConnectionsCountToBe(bob, 3, 60_000);

        await checkInstantUnmute(alice, async () => {
            await Map.teleportToPosition(alice, position.x + 20 * 32, position.y);
            await expectLivekitConnectionsCountToBe(alice, 0, 30_000);
        });
    });
});
