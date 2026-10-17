import { expect, test, type Page } from "@playwright/test";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import Map from "./utils/map";
import { dismissNoMicrophoneSoundToastWhenShown } from "./utils/noMicrophoneSoundToast";
import { publicTestMapUrl } from "./utils/urls";

declare global {
    interface Window {
        __takeCamera: () => void;
        __releaseCamera: () => void;
        __liveTracks: () => string;
    }
}

/**
 * Another application takes the camera. On Windows a busy camera fails getUserMedia with NotReadableError ("Could not
 * start video source"): this page simulates it. It also lists the tracks getUserMedia handed out that are still live.
 */
async function cameraTakenOnDemand(page: Page): Promise<void> {
    await page.addInitScript(() => {
        const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        const tracks: MediaStreamTrack[] = [];
        let taken = false;
        navigator.mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
            if (taken && constraints?.video) {
                throw new DOMException("Could not start video source", "NotReadableError");
            }
            const stream: MediaStream = await getUserMedia(constraints);
            tracks.push(...stream.getTracks());
            return stream;
        };
        window.__takeCamera = () => {
            taken = true;
        };
        window.__releaseCamera = () => {
            taken = false;
        };
        window.__liveTracks = () =>
            tracks
                .filter((track) => track.readyState === "live")
                .map((track) => track.kind)
                .sort()
                .join("+") || "none";
    });
}

test.describe("Camera taken by another application @nomobile @nowebkit @nofirefox", () => {
    test.beforeEach("Chromium only: getUserMedia is wrapped", ({ browserName, page }) => {
        if (browserName !== "chromium" || isMobile(page)) {
            test.skip();
        }
    });

    test("a camera taken by another application does not cost the microphone", async ({ browser }) => {
        test.setTimeout(180_000);
        const url = publicTestMapUrl("tests/E2E/empty.json", "camera-taken");
        await using alice = await getPage(browser, "Alice", url, { pageCreatedHook: cameraTakenOnDemand });
        await dismissNoMicrophoneSoundToastWhenShown(alice);
        await Map.teleportToPosition(alice, 48, 48);
        await using bob = await getPage(browser, "Bob", url);
        await Map.teleportToPosition(bob, 64, 48);
        await expect(alice.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 60_000 });
        await expect.poll(() => alice.evaluate(() => window.__liveTracks()), { timeout: 30_000 }).toBe("audio+video");

        // Out of a bubble and idle, WorkAdventure releases the camera and the microphone
        await Map.teleportToPosition(bob, 288, 288);
        await expect.poll(() => alice.evaluate(() => window.__liveTracks()), { timeout: 30_000 }).toBe("none");

        // Another application takes the camera, and the bubble forms again: WorkAdventure asks for both, it fails
        await alice.evaluate(() => window.__takeCamera());
        await Map.teleportToPosition(bob, 64, 48);
        await expect(alice.locator("#cameras-container").getByText("Bob")).toBeVisible({ timeout: 60_000 });

        // The camera goes off, the microphone stays on and is heard
        await expect(alice.getByTestId("camera-button")).toHaveClass(/bg-danger/, { timeout: 30_000 });
        await expect.poll(() => alice.evaluate(() => window.__liveTracks()), { timeout: 30_000 }).toBe("audio");
        await expect(alice.getByTestId("microphone-button")).not.toHaveClass(/bg-danger/);

        // The other application releases the camera: turning it on works again
        await alice.evaluate(() => window.__releaseCamera());
        await alice.getByTestId("camera-button").click();
        await expect.poll(() => alice.evaluate(() => window.__liveTracks()), { timeout: 30_000 }).toBe("audio+video");
    });
});
