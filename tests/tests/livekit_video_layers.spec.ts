import { expect, test, type Page } from "@playwright/test";
import { firefox } from "playwright-core";
import Map from "./utils/map";
import Menu from "./utils/menu";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import { publicTestMapUrl } from "./utils/urls";
import { expectLivekitConnectionsCountToBe } from "./utils/webRtc";
import { launchOtherBrowser, withoutProjectDefaults } from "./utils/otherBrowser";
import { dismissNoMicrophoneSoundToastWhenShown } from "./utils/noMicrophoneSoundToast";

/**
 * On LiveKit, each viewer receives the camera layer that fits the tile it displays (adaptive stream), and the
 * publisher only encodes the layers someone watches (dynacast).
 *
 * Four users, so that the bubble is on LiveKit (MAX_USERS_FOR_WEBRTC is 3 in dev and CI): Alice and Bob in the
 * Chromium project, Carol and Dave in a Firefox it launches. One camera at a time, to spare the runner's CPU: Alice's
 * first (VP9 simulcast), then Carol's (Firefox publishes VP8; it cannot switch a layer off, livekit-client sends it
 * at 2 fps instead).
 */

const MAP_URL = publicTestMapUrl("tests/E2E/empty.json", "livekit-video-layers");
// A layer below this frame rate is off: Chromium stops it, Firefox sends it at 2 fps
const ON_FPS = 5;
const LAYER_TIMEOUT = 45_000;

interface VideoStream {
    from?: string;
    rid?: string;
    mimeType?: string;
    width: number;
    height: number;
    fps: number;
    kbps: number;
}

// Each call measures for a second (see e2eHooks.getLivekitVideoStreams)
const videoStreams = (page: Page): Promise<{ sent: VideoStream[]; received: VideoStream[] }> =>
    page.evaluate(() => window.e2eHooks.getLivekitVideoStreams());

/** The simulcast layers the page sends its camera in, and the ones that are on. */
async function sentLayers(page: Page): Promise<{ all: VideoStream[]; on: VideoStream[] }> {
    const { sent } = await videoStreams(page);
    return { all: sent, on: sent.filter((layer) => layer.fps >= ON_FPS) };
}

const layersOn = async (page: Page) => (await sentLayers(page)).on.length;

/** The height of the camera of `from` as `page` receives it, 0 when it receives nothing. */
async function receivedHeight(page: Page, from: string): Promise<number> {
    const { received } = await videoStreams(page);
    return received.find((stream) => stream.from === from && stream.fps >= ON_FPS)?.height ?? 0;
}

const tileOf = (page: Page, name: string) => page.locator("#cameras-container > div").filter({ hasText: name });

// With Picture-in-Picture, a hidden tab would keep displaying the videos
const withoutPictureInPicture = {
    pageCreatedHook: (page: Page) =>
        page.addInitScript(() => {
            localStorage.setItem("allowPictureInPicture", "false");
        }),
};

async function setTabHidden(page: Page, hidden: boolean): Promise<void> {
    // Headless browsers never hide a page: emulate what the browser does when the tab goes to the background
    await page.evaluate((hidden) => {
        Object.defineProperty(document, "visibilityState", {
            configurable: true,
            get: () => (hidden ? "hidden" : "visible"),
        });
        Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
        document.dispatchEvent(new Event("visibilitychange"));
    }, hidden);
}

/**
 * The publisher's camera seen by three watchers: as thumbnails, then highlighted by each of `highlighters` in turn,
 * then with every watcher's tab hidden.
 */
async function checkLayers(
    publisher: Page,
    name: string,
    mimeType: string,
    watchers: { name: string; page: Page }[],
    highlighters: { name: string; page: Page }[],
): Promise<void> {
    await expect
        .poll(
            async () => {
                const { all } = await sentLayers(publisher);
                return all.length >= 2 && all.every((layer) => layer.rid && layer.mimeType === mimeType);
            },
            { timeout: 60_000, message: `${name} publishes ${mimeType} as simulcast (one stream per layer)` },
        )
        .toBe(true);

    // Everybody watches a thumbnail: each receives the camera, and the larger layers are off
    for (const watcher of watchers) {
        await expect
            .poll(() => receivedHeight(watcher.page, name), {
                timeout: LAYER_TIMEOUT,
                message: `${watcher.name} receives ${name}'s camera`,
            })
            .toBeGreaterThan(0);
    }
    const allLayers = (await sentLayers(publisher)).all.length;
    await expect
        .poll(() => layersOn(publisher), {
            timeout: LAYER_TIMEOUT,
            message: `${name} sends only the layers thumbnails need`,
        })
        .toBeLessThan(allLayers);
    const thumbnailLayers = await layersOn(publisher);

    for (const highlighter of highlighters) {
        const thumbnailHeight = await receivedHeight(highlighter.page, name);
        await tileOf(highlighter.page, name).locator("button.full-screen-button").click();
        await expect
            .poll(() => receivedHeight(highlighter.page, name), {
                timeout: LAYER_TIMEOUT,
                message: `${highlighter.name} receives a larger layer once ${name} is highlighted`,
            })
            .toBeGreaterThan(thumbnailHeight);
        await expect
            .poll(() => layersOn(publisher), {
                timeout: LAYER_TIMEOUT,
                message: `${name} turns a larger layer on for ${highlighter.name}`,
            })
            .toBeGreaterThan(thumbnailLayers);
        const highlightedHeight = await receivedHeight(highlighter.page, name);
        const other = watchers.find((watcher) => watcher !== highlighter) ?? watchers[0];
        expect(
            await receivedHeight(other.page, name),
            `${other.name} still receives the small layer while ${highlighter.name} watches ${name} highlighted`,
        ).toBeLessThan(highlightedHeight);

        await highlighter.page.getByTestId("highlight-minimize-button").click();
        await expect
            .poll(() => layersOn(publisher), {
                timeout: LAYER_TIMEOUT,
                message: `${name} turns the larger layer off once ${highlighter.name} is back to thumbnails`,
            })
            .toBe(thumbnailLayers);
    }

    // Nobody looks: every watcher's tab goes to the background, the publisher stops encoding
    for (const watcher of watchers) {
        await setTabHidden(watcher.page, true);
    }
    await expect
        .poll(() => layersOn(publisher), {
            timeout: LAYER_TIMEOUT,
            message: `${name} sends no layer while no one looks`,
        })
        .toBe(0);
    for (const watcher of watchers) {
        await setTabHidden(watcher.page, false);
    }
    await expect
        .poll(() => layersOn(publisher), { timeout: LAYER_TIMEOUT, message: `${name} sends again once watched` })
        .toBeGreaterThan(0);
}

test.describe("LiveKit video layers @nomobile @nowebkit @nofirefox", () => {
    test.beforeEach(({ browserName, page }) => {
        test.skip(
            browserName !== "chromium" || isMobile(page),
            "Runs in the desktop Chromium project, which launches Firefox for Carol and Dave",
        );
    });

    test("each viewer gets the layer of the tile it displays, the publisher only sends the layers watched", async ({
        browser,
    }) => {
        test.setTimeout(480_000);
        await using alice = await getPage(browser, "Alice", MAP_URL, withoutPictureInPicture);
        await using bob = await getPage(browser, "Bob", MAP_URL, withoutPictureInPicture);
        const firefoxBrowser = await launchOtherBrowser("firefox");
        try {
            await using carol = await withoutProjectDefaults(firefox, () =>
                getPage(firefoxBrowser, "Carol", MAP_URL, withoutPictureInPicture),
            );
            await using dave = await withoutProjectDefaults(firefox, () =>
                getPage(firefoxBrowser, "Dave", MAP_URL, withoutPictureInPicture),
            );
            const users = [
                { name: "Alice", page: alice },
                { name: "Bob", page: bob },
                { name: "Carol", page: carol },
                { name: "Dave", page: dave },
            ];
            const user = (name: string) => users.filter((candidate) => candidate.name === name);
            const othersThan = (name: string) => users.filter((candidate) => candidate.name !== name);

            for (const { page } of users) {
                await dismissNoMicrophoneSoundToastWhenShown(page);
            }
            // One camera at a time
            for (const { page } of othersThan("Alice")) {
                await Menu.turnOffCamera(page);
            }
            for (const { page } of users) {
                await Map.teleportToPosition(page, 160, 160);
            }
            // Four users: the bubble is on LiveKit, each user connected to the three others
            for (const { page } of users) {
                await expectLivekitConnectionsCountToBe(page, 3, 60_000);
            }

            // Alice (Chromium) publishes; Bob (Chromium) then Carol (Firefox) highlight her
            await checkLayers(alice, "Alice", "video/VP9", othersThan("Alice"), [...user("Bob"), ...user("Carol")]);

            // Carol (Firefox) publishes; Bob (Chromium) then Dave (Firefox) highlight her
            await Menu.turnOffCamera(alice);
            await Menu.turnOnCamera(carol);
            await checkLayers(carol, "Carol", "video/VP8", othersThan("Carol"), [...user("Bob"), ...user("Dave")]);
        } finally {
            await firefoxBrowser.close();
        }
    });
});
