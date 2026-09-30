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

const transceiverCount = (page: Page, kind: "audio" | "video") =>
    page.evaluate(
        (kind) =>
            window.__peerConnections
                .filter((pc) => pc.connectionState !== "closed")
                .flatMap((pc) => pc.getTransceivers())
                .filter((transceiver) => transceiver.receiver.track.kind === kind).length,
        kind,
    );

async function receivedBytes(page: Page, kind: "audio" | "video"): Promise<number> {
    return page.evaluate(async (kind) => {
        let bytes = 0;
        for (const pc of window.__peerConnections) {
            if (pc.connectionState === "closed") continue;
            (await pc.getStats()).forEach((report: { type: string; kind?: string; bytesReceived?: number }) => {
                if (report.type === "inbound-rtp" && report.kind === kind) bytes += report.bytesReceived ?? 0;
            });
        }
        return bytes;
    }, kind);
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

test.describe("P2P mute and camera off keep their senders @nomobile", () => {
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
        await expect.poll(() => receivedBytes(bob, "audio"), { timeout: 15_000 }).toBeGreaterThan(1000);
        await expect.poll(() => markRemoteAudioElement(bob), { timeout: 15_000 }).toBe(true);
        // Let the first negotiation settle before counting
        await expect.poll(() => transceiverCount(alice, "audio"), { timeout: 15_000 }).toBe(1);
        const descriptionsBefore = await localDescriptionCount(alice);

        const aliceIsMuted = bob.getByTestId("Alice is muted.");
        for (let i = 0; i < 3; i++) {
            await Menu.turnOffMicrophone(alice);
            await expect(aliceIsMuted).toBeVisible({ timeout: 15_000 });

            await Menu.turnOnMicrophone(alice);
            await expect(aliceIsMuted).toBeHidden({ timeout: 15_000 });
            const bytes = await receivedBytes(bob, "audio");
            await expect.poll(() => receivedBytes(bob, "audio"), { timeout: 15_000 }).toBeGreaterThan(bytes + 500);
        }

        // Same sender, no new m-line, no renegotiation...
        expect(await transceiverCount(alice, "audio")).toBe(1);
        expect(await localDescriptionCount(alice)).toBe(descriptionsBefore);
        // ...and Bob kept playing Alice through the same <audio> element
        expect(await remoteAudioElementIsStillMounted(bob)).toBe(true);
    });

    test("turning the camera off and on neither renegotiates nor leaves a frozen frame", async ({ browser }) => {
        test.setTimeout(180_000);
        const url = new URL(MAP_URL, play_url).toString();
        await using alice = await getPage(browser, "Alice", url, { pageCreatedHook: instrument });
        await using bob = await getPage(browser, "Bob", url, { pageCreatedHook: instrument });

        const position = await evaluateScript(alice, async () => WA.player.getPosition());
        await Map.teleportToPosition(bob, position.x, position.y);
        await expectWebRtcConnectionsCountToBe(alice, 1, 30_000);
        await expectWebRtcConnectionsCountToBe(bob, 1, 30_000);

        await Menu.turnOnCamera(alice);
        // Bob's own tile is in the container too
        const bobViewOfAlice = bob.locator("#cameras-container > div").filter({ hasText: "Alice" });
        await expect(bobViewOfAlice.getByTestId("webrtc-video")).toBeVisible({ timeout: 30_000 });
        await expect.poll(() => receivedBytes(bob, "video"), { timeout: 15_000 }).toBeGreaterThan(10_000);
        // Let the first negotiation settle before counting
        await expect.poll(() => transceiverCount(alice, "video"), { timeout: 15_000 }).toBe(1);
        const descriptionsBefore = await localDescriptionCount(alice);

        for (let i = 0; i < 3; i++) {
            await Menu.turnOffCamera(alice);
            // The paused track stays on Bob's side: only Alice's camera state hides it
            await expect(bobViewOfAlice.getByTestId("webrtc-video")).toBeHidden({ timeout: 15_000 });

            await Menu.turnOnCamera(alice);
            await expect(bobViewOfAlice.getByTestId("webrtc-video")).toBeVisible({ timeout: 30_000 });
            const bytes = await receivedBytes(bob, "video");
            await expect.poll(() => receivedBytes(bob, "video"), { timeout: 15_000 }).toBeGreaterThan(bytes + 10_000);
        }

        // Same sender, no new m-line, no renegotiation
        expect(await transceiverCount(alice, "video")).toBe(1);
        expect(await localDescriptionCount(alice)).toBe(descriptionsBefore);
    });
});
