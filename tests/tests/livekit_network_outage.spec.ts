import { expect, test, type Page } from "@playwright/test";
import Map from "./utils/map";
import { publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import { isMobile } from "./utils/isMobile";
import { expectLivekitConnectionsCountToBe, expectWebRtcConnectionsCountToBe } from "./utils/webRtc";

// livekit-client retries the signal connection 10 times (~50s) before giving up, then the fix needs a few seconds
// to get a new invitation and reconnect.
test.setTimeout(300_000);

/**
 * Simulates a network outage between ONE browser and the LiveKit server only: the WorkAdventure WebSocket stays up,
 * like a user whose office connectivity blips just long enough for LiveKit to give up.
 *
 * Playwright's routeWebSocket() cannot be used here: its mocked sockets always fire "open" before "close", while a
 * real outage fails before "open" (livekit-client only releases its connection lock in that case). So a tiny
 * WebSocket wrapper is injected in the page instead: while blocked, new signal sockets are pointed at a closed port
 * (error before open, then "Failed to fetch" on the validate call, exactly like the production breadcrumbs) and the
 * live signal sockets are closed with a non-1000 code so livekit-client starts reconnecting.
 *
 * install() must run before the app loads.
 */
function createLivekitOutageSwitch() {
    let blocked = false;
    let page: Page | undefined;
    return {
        install: async (target: Page) => {
            page = target;
            await target.addInitScript(() => {
                const NativeWebSocket = window.WebSocket;
                const liveSignalSockets = new Set<WebSocket>();
                const outage = {
                    blocked: false,
                    block() {
                        outage.blocked = true;
                        for (const socket of liveSignalSockets) {
                            socket.close(4000, "Simulated network outage");
                        }
                        liveSignalSockets.clear();
                    },
                    restore() {
                        outage.blocked = false;
                    },
                };
                (window as unknown as { __livekitOutage: typeof outage }).__livekitOutage = outage;
                window.WebSocket = new Proxy(NativeWebSocket, {
                    construct(NativeClass, args: [string | URL, string | string[] | undefined]) {
                        const [url, protocols] = args;
                        if (!/\/rtc(\/v\d+)?(\?|$)/.test(String(url))) {
                            return new NativeClass(url, protocols);
                        }
                        if (outage.blocked) {
                            // Nothing listens there: the connection is refused before "open"
                            return new NativeClass("ws://127.0.0.1:1/", protocols);
                        }
                        const socket = new NativeClass(url, protocols);
                        liveSignalSockets.add(socket);
                        socket.addEventListener("close", () => liveSignalSockets.delete(socket));
                        return socket;
                    },
                });
            });
            await target.route(/\/rtc\/validate/, (route) => {
                if (blocked) {
                    return route.abort("connectionfailed");
                }
                return route.continue();
            });
        },
        block: async () => {
            blocked = true;
            await page?.evaluate(() =>
                (window as unknown as { __livekitOutage: { block(): void } }).__livekitOutage.block(),
            );
        },
        restore: async () => {
            blocked = false;
            await page?.evaluate(() =>
                (window as unknown as { __livekitOutage: { restore(): void } }).__livekitOutage.restore(),
            );
        },
    };
}

test.describe("LiveKit network outage @nomobile @nofirefox @nowebkit @slow", () => {
    test.beforeEach("Skip on mobile, firefox and webkit", ({ browserName, page, browser }) => {
        if (browserName === "webkit" || isMobile(page) || browser.browserType().name() === "firefox") {
            test.skip();
            return;
        }
    });

    test("should rejoin the LiveKit room after livekit-client gave up reconnecting", async ({ browser }) => {
        const mapUrl = publicTestMapUrl("tests/E2E/empty.json", "livekit-network-outage");

        // Given: 5 users in a meeting, so the space runs on LiveKit. Alice is the one who loses connectivity.
        // Users join one at a time on slightly spread positions: teleporting everyone at once onto the same tile
        // makes the proximity group split and re-form, which flips the space between WebRTC and LiveKit.
        const outage = createLivekitOutageSwitch();
        await using alice = await getPage(browser, "Alice", mapUrl, { pageCreatedHook: outage.install });
        await Map.teleportToPosition(alice, 160, 160);
        await using bob = await getPage(browser, "Bob", mapUrl);
        await Map.teleportToPosition(bob, 168, 160);
        await using eve = await getPage(browser, "Eve", mapUrl);
        await Map.teleportToPosition(eve, 152, 160);
        await using mallory = await getPage(browser, "Mallory", mapUrl);
        await Map.teleportToPosition(mallory, 160, 168);
        await using john = await getPage(browser, "John", mapUrl);
        await Map.teleportToPosition(john, 160, 152);

        await expect(alice.locator("#cameras-container .camera-box")).toHaveCount(5, { timeout: 30_000 });
        await expectLivekitConnectionsCountToBe(alice, 4, 30_000);
        await expectWebRtcConnectionsCountToBe(alice, 0);
        await expectLivekitConnectionsCountToBe(bob, 4, 30_000);

        // When: Alice loses her connection to the LiveKit server for longer than livekit-client is willing to retry
        // (10 attempts, ~50s). Restoring the network any earlier would let livekit-client recover on its own.
        const livekitGaveUp = alice.waitForEvent("console", {
            predicate: (message) => message.text().includes("giving up"),
            timeout: 120_000,
        });
        await outage.block();
        await livekitGaveUp;

        // Then: the dead room is torn down (the old code kept it, with its stale participants, forever), the server
        // dropped Alice and everyone lost her LiveKit participant
        await expectLivekitConnectionsCountToBe(alice, 0, 30_000);
        await expectLivekitConnectionsCountToBe(bob, 3, 30_000);

        // When: the network comes back
        await outage.restore();

        // Then: Alice gets a fresh invitation and rejoins the room. Without the fix, the dead room is kept forever,
        // Alice never publishes again and the others keep a tile of her with "No video stream received".
        await expectLivekitConnectionsCountToBe(alice, 4, 60_000);
        await expectLivekitConnectionsCountToBe(bob, 4, 60_000);
        await expect(alice.locator("#cameras-container .camera-box")).toHaveCount(5, { timeout: 30_000 });
        await expect(bob.locator("#cameras-container").getByText("Alice")).toBeVisible({ timeout: 30_000 });
        await expect(bob.locator("#cameras-container").getByText("No video stream received")).toBeHidden({
            timeout: 30_000,
        });
    });
});
