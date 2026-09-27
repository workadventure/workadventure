import { expect, test, type Page } from "@playwright/test";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import Menu from "./utils/menu";
import { publicTestMapUrl } from "./utils/urls";

/**
 * Replaces the camera with a static checkerboard drawn on a canvas: the fake device of Chromium animates, which
 * would make "the processed frame differs from the raw one" true without any processing.
 */
async function useStaticCheckerboardCamera(page: Page): Promise<void> {
    await page.addInitScript(() => {
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
            const stream: MediaStream = await originalGetUserMedia(constraints);
            if (stream.getVideoTracks().length === 0) {
                return stream;
            }
            for (const track of stream.getVideoTracks()) {
                track.stop();
            }
            const canvas = document.createElement("canvas");
            canvas.width = 320;
            canvas.height = 240;
            const context = canvas.getContext("2d");
            if (!context) {
                throw new Error("Unable to create a 2D context");
            }
            const square = 20;
            const paint = () => {
                for (let y = 0; y < canvas.height; y += square) {
                    for (let x = 0; x < canvas.width; x += square) {
                        context.fillStyle = ((x + y) / square) % 2 === 0 ? "#ffffff" : "#204080";
                        context.fillRect(x, y, square, square);
                    }
                }
                requestAnimationFrame(paint);
            };
            paint();
            const videoTracks: MediaStreamTrack[] = canvas.captureStream(30).getVideoTracks();
            return new MediaStream([...videoTracks, ...stream.getAudioTracks()]);
        };
    });
}

test.describe("Virtual background @nomobile @nowebkit @nofirefox", () => {
    test.beforeEach(
        "Chromium only: the outgoing track is read back with requestVideoFrameCallback",
        ({ browserName, page }) => {
            if (browserName !== "chromium" || isMobile(page)) {
                test.skip();
            }
        },
    );

    test("blur produces a live, non-black frame that differs from the camera", async ({ browser }) => {
        await using page = await getPage(
            browser,
            "User1",
            publicTestMapUrl("tests/E2E/empty.json", "background-effects"),
            { pageCreatedHook: useStaticCheckerboardCamera },
        );
        // The onboarding overlay would sit on top of the settings panel: same setup as the noise suppression test.
        await page.evaluate(() => {
            localStorage.setItem("tutorialDone", "true");
        });
        await page.reload();
        await page.addStyleTag({
            content: `
                [data-testid="onboarding-step"],
                [data-testid^="onboarding-highlight-"] {
                    display: none !important;
                    pointer-events: none !important;
                }
            `,
        });
        await Menu.waitForMapLoad(page, 120_000);

        await Menu.openMediaSettings(page);
        // eslint-disable-next-line playwright/no-force-option
        await page.getByTestId("background-settings-tab").click({ force: true });
        await expect(page.getByTestId("background-effects-unsupported")).toBeHidden();
        // eslint-disable-next-line playwright/no-force-option
        await page.getByTestId("background-blur-50").click({ force: true });

        // Issue #5470: the processed track used to go black. A blurred checkerboard is neither black nor the
        // checkerboard itself.
        await expect
            .poll(() => page.evaluate(() => window.e2eHooks.compareLocalVideoFrames()), { timeout: 60_000 })
            .toEqual(
                expect.objectContaining({
                    processedMeanGray: expect.any(Number),
                    meanAbsDiff: expect.any(Number),
                }),
            );
        await expect
            .poll(
                async () => {
                    const frames = await page.evaluate(() => window.e2eHooks.compareLocalVideoFrames());
                    return frames !== null && frames.processedMeanGray > 20 && frames.meanAbsDiff > 8;
                },
                { timeout: 60_000 },
            )
            .toBe(true);
    });
});
