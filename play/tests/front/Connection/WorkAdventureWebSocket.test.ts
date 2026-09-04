// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/front/Enum/EnvironmentVariable.ts", () => import("../mocks/frontEnvironmentVariableMock"));
vi.mock("../../../src/front/Administration/AnalyticsClient", () => ({
    analyticsClient: { socketReconnected: vi.fn(), socketReconnecting: vi.fn() },
}));

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

    public serverCloses(code: number): void {
        this.readyState = WebSocket.CLOSED;
        this.dispatchEvent(new CloseEvent("close", { code, reason: "", wasClean: true }));
    }
}

describe("WorkAdventureWebSocket close codes", () => {
    let socket: WorkAdventureWebSocket | undefined;

    beforeEach(() => {
        vi.useFakeTimers();
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
});
