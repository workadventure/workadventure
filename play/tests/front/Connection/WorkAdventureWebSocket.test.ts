// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/front/Enum/EnvironmentVariable.ts", () => import("../mocks/frontEnvironmentVariableMock"));
const trackAdminEvent = vi.hoisted(() => vi.fn());
vi.mock("../../../src/front/Administration/AnalyticsClient", () => ({
    analyticsClient: { trackAdminEvent },
}));

import { PusherToFrontWebSocketMessage } from "@workadventure/messages";
import { WS_CLOSE_CODE_SESSION_DESTROYED } from "../../../src/common/WebSocketCloseCodes";
import { WorkAdventureWebSocket } from "../../../src/front/Connection/WorkAdventureWebSocket";

class FakeWebSocket extends EventTarget {
    public static instances: FakeWebSocket[] = [];
    public readyState: number = WebSocket.CONNECTING;
    public binaryType = "blob";
    public send = vi.fn();
    public close = vi.fn();

    constructor(public readonly url: string) {
        super();
        FakeWebSocket.instances.push(this);
    }

    public serverCloses(code: number, wasClean = true): void {
        this.readyState = WebSocket.CLOSED;
        this.dispatchEvent(new CloseEvent("close", { code, reason: "", wasClean }));
    }

    public opens(): void {
        this.readyState = WebSocket.OPEN;
        this.dispatchEvent(new Event("open"));
    }

    public receives(nonce: number): void {
        const bytes = PusherToFrontWebSocketMessage.encode(
            PusherToFrontWebSocketMessage.fromPartial({ nonce }),
        ).finish();
        this.dispatchEvent(new MessageEvent("message", { data: bytes.slice().buffer }));
    }
}

describe("WorkAdventureWebSocket close codes", () => {
    let socket: WorkAdventureWebSocket | undefined;

    beforeEach(() => {
        vi.useFakeTimers();
        trackAdminEvent.mockClear();
        FakeWebSocket.instances = [];
        WorkAdventureWebSocket.setWebsocketFactory((url) => new FakeWebSocket(url) as unknown as WebSocket);
    });

    afterEach(() => {
        // Detaches the window listeners of whichever fake transport is current.
        socket?.close();
        socket = undefined;
        WorkAdventureWebSocket.setWebsocketFactory(null);
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("resumes the transport after a transient close", () => {
        socket = new WorkAdventureWebSocket("ws://pusher/ws/room?tabId=tab");
        const onclose = vi.fn();
        socket.onclose = onclose;

        FakeWebSocket.instances[0].serverCloses(1006);
        vi.advanceTimersByTime(10_000);

        expect(onclose).not.toHaveBeenCalled();
        expect(FakeWebSocket.instances).toHaveLength(2);
        expect(new URL(FakeWebSocket.instances[1].url).searchParams.get("lastReceivedNonce")).toBe("0");
    });

    it("does not resume after the pusher destroyed the session", () => {
        socket = new WorkAdventureWebSocket("ws://pusher/ws/room?tabId=tab");
        const onclose = vi.fn();
        socket.onclose = onclose;

        FakeWebSocket.instances[0].serverCloses(WS_CLOSE_CODE_SESSION_DESTROYED);
        vi.advanceTimersByTime(10_000);

        expect(onclose).toHaveBeenCalledOnce();
        expect(onclose.mock.calls[0][0].code).toBe(WS_CLOSE_CODE_SESSION_DESTROYED);
        expect(FakeWebSocket.instances).toHaveLength(1);
    });

    it("reports how the socket closed and how long it took to come back", () => {
        vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
        socket = new WorkAdventureWebSocket("ws://pusher/ws/room?tabId=tab");
        FakeWebSocket.instances[0].opens();
        vi.advanceTimersByTime(20_000);
        FakeWebSocket.instances[0].receives(1);
        // 60 s of server silence, then a drop with no close frame: what a proxy idle timeout looks like.
        vi.advanceTimersByTime(60_000);
        FakeWebSocket.instances[0].serverCloses(1006, false);
        vi.advanceTimersByTime(500);

        expect(trackAdminEvent).toHaveBeenLastCalledWith("websocket.reconnecting", {
            attempt: 1,
            closeCode: 1006,
            wasClean: false,
            secondsSinceLastServerMessage: 60,
            tabVisible: false,
        });

        // The first retry never opens: still counted from the last frame of the socket that did.
        FakeWebSocket.instances[1].serverCloses(1006, false);
        vi.advanceTimersByTime(1_000);

        expect(trackAdminEvent).toHaveBeenLastCalledWith("websocket.reconnecting", {
            attempt: 2,
            closeCode: 1006,
            wasClean: false,
            secondsSinceLastServerMessage: 60.5,
            tabVisible: false,
        });

        FakeWebSocket.instances[2].opens();

        expect(trackAdminEvent).toHaveBeenLastCalledWith("websocket.reconnected", {
            attempts: 2,
            downtimeSeconds: 1.5,
        });
    });
});
