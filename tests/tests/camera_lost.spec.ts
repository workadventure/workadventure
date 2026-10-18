import { expect, test, type Page } from "@playwright/test";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import Map from "./utils/map";
import { dismissNoMicrophoneSoundToastWhenShown } from "./utils/noMicrophoneSoundToast";
import { publicTestMapUrl } from "./utils/urls";

declare global {
    interface Window {
        __loseCamera: () => void;
        __liveVideoTracks: () => number;
        __cameraRequests: () => string[];
    }
}

const SECOND_CAMERA_ID = "second-camera";

/**
 * The camera goes away while in use (an iPhone used as a Continuity Camera that disconnects): the browser stops the
 * track and fires "ended" on it. This page simulates it on the live camera tracks getUserMedia handed out, lists a
 * second camera (served by the fake one), and records which camera each getUserMedia call asked for.
 */
async function cameraLostOnDemand(page: Page): Promise<void> {
    await page.addInitScript((secondCameraId) => {
        const mediaDevices = navigator.mediaDevices;
        const getUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
        const enumerateDevices = mediaDevices.enumerateDevices.bind(mediaDevices);
        const tracks: MediaStreamTrack[] = [];
        const cameraRequests: string[] = [];
        mediaDevices.enumerateDevices = async () => [
            ...(await enumerateDevices()),
            {
                deviceId: secondCameraId,
                groupId: secondCameraId,
                kind: "videoinput",
                label: "Second camera",
                toJSON: () => ({}),
            },
        ];
        mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
            let video = constraints?.video;
            if (video) {
                const deviceId = typeof video === "object" ? video.deviceId : undefined;
                const exact = typeof deviceId === "object" && !Array.isArray(deviceId) ? deviceId.exact : deviceId;
                cameraRequests.push(typeof exact === "string" ? exact : "default");
                if (exact === secondCameraId && typeof video === "object") {
                    video = { ...video };
                    delete video.deviceId;
                }
            }
            const stream: MediaStream = await getUserMedia({ ...constraints, video });
            tracks.push(...stream.getVideoTracks());
            return stream;
        };
        const liveTracks = () => tracks.filter((track) => track.readyState === "live");
        window.__loseCamera = () => {
            for (const track of liveTracks()) {
                track.stop();
                track.dispatchEvent(new Event("ended"));
            }
        };
        window.__liveVideoTracks = () => liveTracks().length;
        window.__cameraRequests = () => [...cameraRequests];
    }, SECOND_CAMERA_ID);
}

test.describe("Camera lost while in use @nomobile @nowebkit @nofirefox", () => {
    test.beforeEach("Chromium only: getUserMedia is wrapped", ({ browserName, page }) => {
        if (browserName !== "chromium" || isMobile(page)) {
            test.skip();
        }
    });

    test("a disconnected camera is never replaced behind the user's back", async ({ browser }) => {
        test.setTimeout(120_000);
        const url = publicTestMapUrl("tests/E2E/empty.json", "camera-lost");
        await using alice = await getPage(browser, "Alice", url, { pageCreatedHook: cameraLostOnDemand });
        await dismissNoMicrophoneSoundToastWhenShown(alice);
        await Map.teleportToPosition(alice, 48, 48);
        // In a bubble, so that the energy saving does not release the camera
        await using bob = await getPage(browser, "Bob", url);
        await Map.teleportToPosition(bob, 64, 48);
        await expect(alice.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 60_000 });
        await expect.poll(() => alice.evaluate(() => window.__liveVideoTracks()), { timeout: 30_000 }).toBe(1);
        const requestsBefore = await alice.evaluate(() => window.__cameraRequests().length);

        await alice.evaluate(() => window.__loseCamera());

        // The user is told and offered the other camera, nothing asks for a camera meanwhile
        await expect(alice.getByText(/is disconnected/)).toBeVisible({ timeout: 30_000 });
        const useSecondCamera = alice.getByTestId("camera-unavailable-use");
        await expect(useSecondCamera).toHaveText(/Second camera/);
        expect(await alice.evaluate(() => window.__cameraRequests().length)).toBe(requestsBefore);
        expect(await alice.evaluate(() => window.__liveVideoTracks())).toBe(0);

        // The user picks the other camera
        await useSecondCamera.click();
        await expect.poll(() => alice.evaluate(() => window.__cameraRequests().at(-1))).toBe(SECOND_CAMERA_ID);
        await expect.poll(() => alice.evaluate(() => window.__liveVideoTracks()), { timeout: 30_000 }).toBe(1);
        await expect(alice.getByTestId("camera-unavailable-retry")).toBeHidden();
    });
});
