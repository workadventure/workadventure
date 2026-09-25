import { expect, test, type Page } from "@playwright/test";
import Map from "./utils/map";
import Menu from "./utils/menu";
import { getPage } from "./utils/auth";
import { evaluateScript } from "./utils/scripting";
import { expectWebRtcConnectionsCountToBe } from "./utils/webRtc";
import { play_url, publicTestMapUrl } from "./utils/urls";

const MAP_URL = publicTestMapUrl("tests/E2E/empty.json", "p2p-mute-keeps-sender");

declare global {
    interface Window {
        __peerConnections: RTCPeerConnection[];
        __localDescriptionCount: number;
        __remoteAudioElement: HTMLAudioElement | undefined;
    }
}

// Keeps every peer connection and counts the local descriptions, so the test can see each renegotiation
const instrument = async (page: Page) => {
    await page.addInitScript(() => {
        window.__peerConnections = [];
        window.__localDescriptionCount = 0;
        const NativePeerConnection = window.RTCPeerConnection;
        window.RTCPeerConnection = class extends NativePeerConnection {
            constructor(configuration?: RTCConfiguration) {
                super(configuration);
                window.__peerConnections.push(this);
            }
            setLocalDescription(description?: RTCLocalSessionDescriptionInit): Promise<void> {
                window.__localDescriptionCount++;
                return super.setLocalDescription(description);
            }
        };
    });
};

const localDescriptionCount = (page: Page) => page.evaluate(() => window.__localDescriptionCount);

const audioTransceiverCount = (page: Page) =>
    page.evaluate(
        () =>
            window.__peerConnections
                .filter((pc) => pc.connectionState !== "closed")
                .flatMap((pc) => pc.getTransceivers())
                .filter((transceiver) => transceiver.receiver.track.kind === "audio").length,
    );

async function receivedAudioBytes(page: Page): Promise<number> {
    return page.evaluate(async () => {
        let bytes = 0;
        for (const pc of window.__peerConnections) {
            if (pc.connectionState === "closed") continue;
            (await pc.getStats()).forEach((report: { type: string; kind?: string; bytesReceived?: number }) => {
                if (report.type === "inbound-rtp" && report.kind === "audio") bytes += report.bytesReceived ?? 0;
            });
        }
        return bytes;
    });
}

// The <audio> element that plays the remote peer (the other <audio> elements play files, not a MediaStream)
const markRemoteAudioElement = (page: Page) =>
    page.evaluate(() => {
        window.__remoteAudioElement = [...document.querySelectorAll("audio")].find(
            (audio) => audio.srcObject instanceof MediaStream,
        );
        return window.__remoteAudioElement !== undefined;
    });

const remoteAudioElementIsStillMounted = (page: Page) =>
    page.evaluate(() => {
        const audio = window.__remoteAudioElement;
        return audio !== undefined && audio.isConnected;
    });

test.describe("P2P mute keeps the audio sender @nomobile", () => {
    test.beforeEach(({ browserName }) => {
        test.skip(browserName !== "chromium", "fake microphone flags are set on the Chromium project");
    });

    test("muting and unmuting neither renegotiates nor replaces the viewer's audio", async ({ browser }) => {
        test.setTimeout(180_000);
        const url = new URL(MAP_URL, play_url).toString();
        await using alice = await getPage(browser, "Alice", url, { pageCreatedHook: instrument });
        await using bob = await getPage(browser, "Bob", url, { pageCreatedHook: instrument });

        const position = await evaluateScript(alice, async () => WA.player.getPosition());
        await Map.teleportToPosition(bob, position.x, position.y);
        await expectWebRtcConnectionsCountToBe(alice, 1, 30_000);
        await expectWebRtcConnectionsCountToBe(bob, 1, 30_000);

        await Menu.turnOnMicrophone(alice);
        await expect.poll(() => receivedAudioBytes(bob), { timeout: 15_000 }).toBeGreaterThan(1000);
        await expect.poll(() => markRemoteAudioElement(bob), { timeout: 15_000 }).toBe(true);
        // Let the first negotiation settle before counting
        await expect.poll(() => audioTransceiverCount(alice), { timeout: 15_000 }).toBe(1);
        const descriptionsBefore = await localDescriptionCount(alice);

        const aliceIsMuted = bob.getByTestId("Alice is muted.");
        for (let i = 0; i < 3; i++) {
            await Menu.turnOffMicrophone(alice);
            await expect(aliceIsMuted).toBeVisible({ timeout: 15_000 });

            await Menu.turnOnMicrophone(alice);
            await expect(aliceIsMuted).toBeHidden({ timeout: 15_000 });
            const bytes = await receivedAudioBytes(bob);
            await expect.poll(() => receivedAudioBytes(bob), { timeout: 15_000 }).toBeGreaterThan(bytes + 500);
        }

        // Same sender, no new m-line, no renegotiation...
        expect(await audioTransceiverCount(alice)).toBe(1);
        expect(await localDescriptionCount(alice)).toBe(descriptionsBefore);
        // ...and Bob kept playing Alice through the same <audio> element
        expect(await remoteAudioElementIsStillMounted(bob)).toBe(true);
    });
});
