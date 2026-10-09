import { expect, test, type Page } from "@playwright/test";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import Map from "./utils/map";
import Menu from "./utils/menu";
import { evaluateScript } from "./utils/scripting";
import { expectWebRtcConnectionsCountToBe } from "./utils/webRtc";
import { publicTestMapUrl } from "./utils/urls";

declare global {
    interface Window {
        __backgroundPipeStarts: number;
    }
}

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

/**
 * Counts the pipes the main thread starts in the background worker: one per camera track it transforms.
 */
async function countBackgroundPipeStarts(page: Page): Promise<void> {
    await page.addInitScript(() => {
        window.__backgroundPipeStarts = 0;
        const NativeWorker = window.Worker;
        window.Worker = class extends NativeWorker {
            postMessage(...args: Parameters<Worker["postMessage"]>): void {
                const message: unknown = args[0];
                if (
                    typeof message === "object" &&
                    message !== null &&
                    (message as { type?: unknown }).type === "start-stream"
                ) {
                    window.__backgroundPipeStarts++;
                }
                super.postMessage(...args);
            }
        };
    });
}

/**
 * A blurred checkerboard is neither black nor the checkerboard itself.
 */
async function expectBlurredFrame(page: Page): Promise<void> {
    await expect
        .poll(
            async () => {
                const frames = await page.evaluate(() => window.e2eHooks.compareLocalVideoFrames());
                return frames !== null && frames.processedMeanGray > 20 && frames.meanAbsDiff > 8;
            },
            { timeout: 60_000 },
        )
        .toBe(true);
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

        // Issue #5470: the processed track used to go black.
        await expect
            .poll(() => page.evaluate(() => window.e2eHooks.compareLocalVideoFrames()), { timeout: 60_000 })
            .toEqual(
                expect.objectContaining({
                    processedMeanGray: expect.any(Number),
                    meanAbsDiff: expect.any(Number),
                }),
            );
        await expectBlurredFrame(page);
    });

    test("toggling the microphone in a conversation keeps the same blur pipe", async ({ browser }) => {
        test.setTimeout(240_000);
        const url = publicTestMapUrl("tests/E2E/empty.json", "background-effects-microphone");
        await using alice = await getPage(browser, "Alice", url, {
            pageCreatedHook: async (page) => {
                await useStaticCheckerboardCamera(page);
                await countBackgroundPipeStarts(page);
            },
        });
        // The onboarding overlay would sit on top of the settings panel: same setup as the first test.
        await alice.evaluate(() => {
            localStorage.setItem("tutorialDone", "true");
        });
        await alice.reload();
        await alice.addStyleTag({
            content: `
                [data-testid="onboarding-step"],
                [data-testid^="onboarding-highlight-"] {
                    display: none !important;
                    pointer-events: none !important;
                }
            `,
        });
        await Menu.waitForMapLoad(alice, 120_000);
        await using bob = await getPage(browser, "Bob", url);

        // Alone, energy saving keeps the microphone closed, so toggling it never rebuilds the raw stream. In a
        // conversation it does, and that is where the blur pipe used to be rebuilt on every toggle.
        const position = await evaluateScript(alice, async () => WA.player.getPosition());
        await Map.teleportToPosition(bob, position.x, position.y);
        await expectWebRtcConnectionsCountToBe(alice, 1, 30_000);
        await Menu.turnOnMicrophone(alice);

        await Menu.openMediaSettings(alice);
        // eslint-disable-next-line playwright/no-force-option
        await alice.getByTestId("background-settings-tab").click({ force: true });
        // eslint-disable-next-line playwright/no-force-option
        await alice.getByTestId("background-blur-50").click({ force: true });
        // Baseline once the blur is on screen, so a pipe still starting from the click is not blamed on the toggles.
        await expectBlurredFrame(alice);
        expect(await alice.evaluate(() => window.__backgroundPipeStarts)).toBeGreaterThan(0);
        const pipeStarts = await alice.evaluate(() => window.__backgroundPipeStarts);

        // Each toggle rebuilds the raw stream around the same camera track. Rebuilding the blur pipe for it
        // swapped the outgoing video, and sometimes killed the blur.
        const aliceIsMuted = bob.getByTestId("Alice is muted.");
        for (let i = 0; i < 3; i++) {
            await Menu.turnOffMicrophone(alice);
            await expect(aliceIsMuted).toBeVisible({ timeout: 15_000 });
            await Menu.turnOnMicrophone(alice);
            await expect(aliceIsMuted).toBeHidden({ timeout: 15_000 });
        }

        expect(await alice.evaluate(() => window.__backgroundPipeStarts)).toBe(pipeStarts);
        // ...and the blur is still applied: a terminal failure would stop the pipe without starting a new one.
        await expectBlurredFrame(alice);
    });
});
