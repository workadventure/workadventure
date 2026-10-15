import { expect, test, type Page } from "@playwright/test";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import Map from "./utils/map";
import { evaluateScript } from "./utils/scripting";
import { expectWebRtcConnectionsCountToBe } from "./utils/webRtc";
import { publicTestMapUrl } from "./utils/urls";

declare global {
    interface Window {
        __holdCameraBack: () => void;
        __releaseCamera: () => void;
    }
}

/**
 * A camera the system holds back while the user is away (a locked session, a suspended device): the track stays
 * "live" but no frame comes, and asking for the camera again never answers.
 *
 * Alice's camera goes through a MediaStreamTrackGenerator this page can freeze. Once held back, every getUserMedia
 * asking for video stays pending until the camera is released.
 */
async function holdCameraBackOnDemand(page: Page): Promise<void> {
    await page.addInitScript(() => {
        const { MediaStreamTrackProcessor, MediaStreamTrackGenerator } = window as unknown as {
            MediaStreamTrackProcessor: new (init: { track: MediaStreamTrack }) => {
                readable: ReadableStream<VideoFrame>;
            };
            MediaStreamTrackGenerator: new (init: { kind: "video" }) => MediaStreamTrack & {
                writable: WritableStream<VideoFrame>;
            };
        };
        const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        const cameras: { frozen: boolean }[] = [];
        let heldBack = false;
        navigator.mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
            if (heldBack && constraints?.video) {
                return new Promise<MediaStream>(() => {
                    // Never settles, like a camera the system keeps
                });
            }
            const stream: MediaStream = await getUserMedia(constraints);
            const source = stream.getVideoTracks()[0];
            if (!source) {
                return stream;
            }
            const camera = { frozen: false };
            cameras.push(camera);
            const generator = new MediaStreamTrackGenerator({ kind: "video" });
            new MediaStreamTrackProcessor({ track: source }).readable
                .pipeThrough(
                    new TransformStream<VideoFrame, VideoFrame>({
                        transform(frame, controller) {
                            if (camera.frozen) {
                                frame.close();
                            } else {
                                controller.enqueue(frame);
                            }
                        },
                    }),
                )
                .pipeTo(generator.writable)
                .catch(() => undefined);
            const stopGenerator = generator.stop.bind(generator);
            generator.stop = () => {
                source.stop();
                stopGenerator();
            };
            const audioTracks: MediaStreamTrack[] = stream.getAudioTracks();
            return new MediaStream([generator, ...audioTracks]);
        };
        window.__holdCameraBack = () => {
            heldBack = true;
            for (const camera of cameras) {
                camera.frozen = true;
            }
        };
        window.__releaseCamera = () => {
            heldBack = false;
        };
    });
}

test.describe("Camera held back @nomobile @nowebkit @nofirefox", () => {
    test.beforeEach(
        "Chromium only: the camera is relayed through a MediaStreamTrackGenerator",
        ({ browserName, page }) => {
            if (browserName !== "chromium" || isMobile(page)) {
                test.skip();
            }
        },
    );

    test("a camera that stops delivering images is marked unavailable, not turned off", async ({ browser }) => {
        test.setTimeout(240_000);
        const url = publicTestMapUrl("tests/E2E/empty.json", "camera-unavailable");
        await using alice = await getPage(browser, "Alice", url, { pageCreatedHook: holdCameraBackOnDemand });
        await using bob = await getPage(browser, "Bob", url);
        const stallWarnings: string[] = [];
        alice.on("console", (message) => {
            if (message.text().startsWith("The camera has delivered no frame")) {
                stallWarnings.push(message.text());
            }
        });

        const position = await evaluateScript(alice, async () => WA.player.getPosition());
        await Map.teleportToPosition(bob, position.x, position.y);
        await expect(alice.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 60_000 });
        await expect(bob.locator("#cameras-container").getByText("Alice")).toBeVisible({ timeout: 60_000 });
        await expectWebRtcConnectionsCountToBe(alice, 1, 30_000);
        // Let the encoders warm up and Alice's camera reach Bob
        await alice.waitForTimeout(10_000);

        await alice.evaluate(() => window.__holdCameraBack());

        // Alice's camera is not turned off: the button warns, and the warning offers to try again
        const cameraButton = alice.getByTestId("camera-button");
        await expect(cameraButton).toHaveClass(/bg-warning/, { timeout: 30_000 });
        await expect(alice.getByTestId("camera-no-image-retry")).toBeVisible();
        // Her own tile keeps showing what her camera gives: the mention is for the others
        await expect(alice.locator("#cameras-container").getByTestId("camera-unavailable")).toBeHidden();
        // Bob sees her avatar marked unavailable, not a red tile
        await expect(bob.locator("#cameras-container").getByTestId("camera-unavailable")).toBeVisible({
            timeout: 30_000,
        });
        await expect(bob.getByText("No video stream received.")).toBeHidden();

        // A long absence: the camera is judged once, and stays wanted on
        await alice.waitForTimeout(40_000);
        expect(stallWarnings).toHaveLength(1);
        await expect(cameraButton).toHaveClass(/bg-warning/);
        await expect(bob.getByText("No video stream received.")).toBeHidden();

        // The system releases the camera, Alice comes back and tries again: the video is back for Bob
        await alice.evaluate(() => window.__releaseCamera());
        await alice.getByTestId("camera-no-image-retry").click();
        await expect(bob.locator("#cameras-container").getByTestId("camera-unavailable")).toBeHidden({
            timeout: 30_000,
        });
        await expect(alice.getByTestId("camera-no-image-retry")).toBeHidden();
        await expect(cameraButton).not.toHaveClass(/bg-warning|bg-danger/);
    });
});
