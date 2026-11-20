import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerToClientMessage } from "@workadventure/messages";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));
vi.mock("@workadventure/messages", () => ({
    PusherToFrontWebSocketMessage: {
        encode: () => ({ finish: () => new Uint8Array(1) }),
    },
}));

import { NoncedMessageStore } from "../../src/common/NoncedMessageStore";
import { WS_CLOSE_CODE_SESSION_DESTROYED } from "../../src/common/WebSocketCloseCodes";
import { PusherWebSocket, RESUME_STORE_MAX_MESSAGES, type RawSocket } from "../../src/pusher/services/PusherWebSocket";

const bytes = (length: number) => new Uint8Array(length);
const nonces = (messages: { nonce: number }[]) => messages.map(({ nonce }) => nonce);

describe("NoncedMessageStore", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("prunes expired messages, keeps fresh ones and frees their bytes", () => {
        const store = new NoncedMessageStore(1_000, Infinity, 3);
        store.add(1, bytes(1));
        store.add(2, bytes(1));
        vi.advanceTimersByTime(600);
        store.add(3, bytes(1));
        vi.advanceTimersByTime(400);

        expect(nonces(store.getAll())).toEqual([3]);
        // 1 and 2 no longer count towards the 3-byte cap.
        expect(store.add(4, bytes(2))).toBe(true);
    });

    it("returns the messages after a nonce", () => {
        const store = new NoncedMessageStore();
        for (let nonce = 1; nonce <= 5; nonce++) {
            store.add(nonce, bytes(1));
        }

        expect(nonces(store.getAfter(0))).toEqual([1, 2, 3, 4, 5]);
        expect(nonces(store.getAfter(3))).toEqual([4, 5]);
        expect(store.getAfter(5)).toEqual([]);
    });

    it("drops everything past its caps and refuses a resume that needs a dropped message", () => {
        const store = new NoncedMessageStore(30_000, 2);
        expect(store.add(1, bytes(1))).toBe(true);
        expect(store.add(2, bytes(1))).toBe(true);
        expect(store.add(3, bytes(1))).toBe(false);

        expect(store.getAll()).toEqual([]);
        expect(store.hasEveryNonceAfter(2)).toBe(false);
        expect(store.hasEveryNonceAfter(3)).toBe(true);

        expect(new NoncedMessageStore(30_000, Infinity, 10).add(1, bytes(11))).toBe(false);
    });
});

describe("PusherWebSocket resume store overflow", () => {
    const message: ServerToClientMessage = { message: undefined };

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function createRawSocket(sendStatus: number) {
        return {
            send: vi.fn(() => sendStatus),
            end: vi.fn(),
            ping: vi.fn(() => 1),
            getUserData: () => ({ userUuid: "user-1", tabId: "tab-1" }),
        };
    }

    it("destroys the session of a client stuck behind backpressure", () => {
        // uWS buffers the first frame, then every later one waits for a drain that never comes.
        const rawSocket = createRawSocket(0);
        const socket = new PusherWebSocket(rawSocket as unknown as RawSocket);
        for (let i = 0; i < RESUME_STORE_MAX_MESSAGES; i++) {
            socket.send(message);
        }
        expect(rawSocket.end).not.toHaveBeenCalled();

        socket.send(message);

        expect(rawSocket.end).toHaveBeenCalledWith(WS_CLOSE_CODE_SESSION_DESTROYED, expect.any(String));
    });

    it("keeps a caught-up client connected when its store overflows", () => {
        const rawSocket = createRawSocket(1);
        const socket = new PusherWebSocket(rawSocket as unknown as RawSocket);
        for (let i = 0; i <= RESUME_STORE_MAX_MESSAGES; i++) {
            socket.send(message);
        }

        expect(rawSocket.send).toHaveBeenCalledTimes(RESUME_STORE_MAX_MESSAGES + 1);
        expect(rawSocket.end).not.toHaveBeenCalled();
    });
});
