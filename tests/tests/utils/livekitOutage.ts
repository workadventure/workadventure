import type { Page } from "@playwright/test";

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
 * install() must run before the app loads (use getPage()'s pageCreatedHook). livekit-client retries 10 times (~50s)
 * before giving up: waitForLivekitToGiveUp() must be awaited before restore(), otherwise livekit-client simply
 * recovers on its own and the give-up path is never exercised.
 */
export function createLivekitOutageSwitch() {
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
        /**
         * Resolves once livekit-client logged that it gave up reconnecting. Must be called before block().
         */
        waitForLivekitToGiveUp: (timeout = 120_000) => {
            if (!page) {
                throw new Error("install() must be called first");
            }
            return page.waitForEvent("console", {
                predicate: (message) => message.text().includes("giving up"),
                timeout,
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
