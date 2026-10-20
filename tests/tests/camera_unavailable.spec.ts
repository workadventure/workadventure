import { expect, test, type Page } from "@playwright/test";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import Map from "./utils/map";
import { dismissNoMicrophoneSoundToastWhenShown } from "./utils/noMicrophoneSoundToast";
import { publicTestMapUrl } from "./utils/urls";

declare global {
    interface Window {
        __freezeCamera: () => void;
        __holdCameraBack: () => void;
        __takeCamera: () => void;
        __releaseCamera: () => void;
        __liveTracks: () => string;
    }
}

/**
 * Alice's camera goes through a MediaStreamTrackGenerator this page can freeze, as a camera that stops delivering
 * frames while its track stays "live". On top of it:
 * - __holdCameraBack: frozen, and every later getUserMedia for video stays pending (a camera the system keeps);
 * - __takeCamera: every later getUserMedia for video fails with NotReadableError, as on Windows while another
 *   application (Teams, Meet…) holds the camera;
 * - __releaseCamera: the camera is free again.
 * __liveTracks lists the kinds of the tracks handed out that are still live.
 */
async function controllableCamera(page: Page): Promise<void> {
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
        const tracks: MediaStreamTrack[] = [];
        let state: "free" | "held" | "taken" = "free";
        navigator.mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
            if (constraints?.video && state === "held") {
                return new Promise<MediaStream>(() => {
                    // Never settles, like a camera the system keeps
                });
            }
            if (constraints?.video && state === "taken") {
                throw new DOMException("Could not start video source", "NotReadableError");
            }
            const stream: MediaStream = await getUserMedia(constraints);
            const audioTracks: MediaStreamTrack[] = stream.getAudioTracks();
            tracks.push(...audioTracks);
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
            tracks.push(generator);
            return new MediaStream([generator, ...audioTracks]);
        };
        window.__freezeCamera = () => {
            for (const camera of cameras) {
                camera.frozen = true;
            }
        };
        window.__holdCameraBack = () => {
            state = "held";
            window.__freezeCamera();
        };
        window.__takeCamera = () => {
            state = "taken";
        };
        window.__releaseCamera = () => {
            state = "free";
        };
        window.__liveTracks = () =>
            tracks
                .filter((track) => track.readyState === "live")
                .map((track) => track.kind)
                .sort()
                .join("+") || "none";
    });
}

test.describe("Camera unavailable @nomobile @nowebkit @nofirefox", () => {
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
        await using alice = await getPage(browser, "Alice", url, { pageCreatedHook: controllableCamera });
        await dismissNoMicrophoneSoundToastWhenShown(alice);
        await Map.teleportToPosition(alice, 48, 48);
        await using bob = await getPage(browser, "Bob", url);
        await Map.teleportToPosition(bob, 64, 48);
        const stallWarnings: string[] = [];
        alice.on("console", (message) => {
            if (message.text().startsWith("The camera ")) {
                stallWarnings.push(message.text());
            }
        });
        await expect(bob.locator("#cameras-container").getByText("Alice")).toBeVisible({ timeout: 60_000 });
        await expect.poll(() => alice.evaluate(() => window.__liveTracks()), { timeout: 30_000 }).toBe("audio+video");
        // Let the encoders warm up and Alice's camera reach Bob
        await alice.waitForTimeout(10_000);

        await alice.evaluate(() => window.__holdCameraBack());

        // Alice's camera is not turned off: the button warns, and the warning offers to try again
        const cameraButton = alice.getByTestId("camera-button");
        await expect(cameraButton).toHaveClass(/bg-warning/, { timeout: 30_000 });
        await expect(alice.getByTestId("camera-unavailable-retry")).toBeVisible();
        // Bob sees her avatar marked unavailable, not a red tile
        await expect(bob.locator("#cameras-container").getByTestId("camera-unavailable")).toBeVisible({
            timeout: 30_000,
        });
        await expect(bob.getByText("No video stream received.")).toBeHidden();

        // A long absence: judged once, nothing asked for again on its own, the camera still wanted
        await alice.waitForTimeout(40_000);
        expect(stallWarnings).toEqual(["The camera has delivered no frame for 3 seconds: it is unavailable"]);
        await expect(cameraButton).toHaveClass(/bg-warning/);
        await expect(bob.getByText("No video stream received.")).toBeHidden();

        // The system releases the camera, Alice comes back and tries again: the video is back for Bob
        await alice.evaluate(() => window.__releaseCamera());
        await alice.getByTestId("camera-unavailable-retry").click();
        await expect(bob.locator("#cameras-container").getByTestId("camera-unavailable")).toBeHidden({
            timeout: 30_000,
        });
        await expect(alice.getByTestId("camera-unavailable-retry")).toBeHidden();
        await expect(cameraButton).not.toHaveClass(/bg-warning|bg-danger/);
    });

    test("a camera taken by another application keeps the microphone, and comes back by itself", async ({
        browser,
    }) => {
        test.setTimeout(240_000);
        const url = publicTestMapUrl("tests/E2E/empty.json", "camera-in-use");
        await using alice = await getPage(browser, "Alice", url, { pageCreatedHook: controllableCamera });
        await dismissNoMicrophoneSoundToastWhenShown(alice);
        await Map.teleportToPosition(alice, 48, 48);
        await using bob = await getPage(browser, "Bob", url);
        await Map.teleportToPosition(bob, 64, 48);
        await expect(alice.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 60_000 });
        await expect.poll(() => alice.evaluate(() => window.__liveTracks()), { timeout: 30_000 }).toBe("audio+video");

        // Out of a bubble and idle, WorkAdventure releases the camera and the microphone
        await Map.teleportToPosition(bob, 288, 288);
        await expect.poll(() => alice.evaluate(() => window.__liveTracks()), { timeout: 30_000 }).toBe("none");

        // Another application takes the camera, and the bubble forms again: the camera is unavailable, the microphone
        // is asked for alone, and Bob sees why there is no video
        await alice.evaluate(() => window.__takeCamera());
        await Map.teleportToPosition(bob, 64, 48);
        await expect(alice.getByTestId("camera-button")).toHaveClass(/bg-warning/, { timeout: 30_000 });
        await expect.poll(() => alice.evaluate(() => window.__liveTracks()), { timeout: 30_000 }).toBe("audio");
        await expect(alice.getByTestId("microphone-button")).not.toHaveClass(/bg-danger/);
        await expect(bob.locator("#cameras-container").getByTestId("camera-unavailable")).toBeVisible({
            timeout: 30_000,
        });

        // The other application releases the camera: the next conversation brings it back, nobody clicks anything
        await alice.evaluate(() => window.__releaseCamera());
        await Map.teleportToPosition(bob, 288, 288);
        await expect(alice.locator("#cameras-container").getByText("Bob")).toBeHidden({ timeout: 30_000 });
        await Map.teleportToPosition(bob, 64, 48);
        await expect.poll(() => alice.evaluate(() => window.__liveTracks()), { timeout: 30_000 }).toBe("audio+video");
        await expect(alice.getByTestId("camera-button")).not.toHaveClass(/bg-warning|bg-danger/);
        await expect(bob.locator("#cameras-container").getByTestId("camera-unavailable")).toBeHidden();
    });
});
