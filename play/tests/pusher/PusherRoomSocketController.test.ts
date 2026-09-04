import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));
vi.mock("@workadventure/messages", () => ({
    FrontToPusherWebSocketMessage: {
        decode: vi.fn(),
    },
    PusherToFrontWebSocketMessage: {
        encode: vi.fn(() => ({
            finish: () => new Uint8Array([1]),
        })),
    },
}));

import { CLIENT_DISCONNECTION_RETENTION_MS } from "../../src/pusher/enums/EnvironmentVariable";
import type { SocketData } from "../../src/pusher/models/Websocket/SocketData";
import { PusherRoomSocketController } from "../../src/pusher/services/PusherRoomSocketController";
import { PusherWebSocket, type RawSocket } from "../../src/pusher/services/PusherWebSocket";

type RegisteredHandlers = {
    open: (socket: unknown) => void | Promise<void>;
    close: (socket: unknown, code?: number, message?: ArrayBuffer) => void | Promise<void>;
    drain: (socket: unknown) => void | Promise<void>;
};

describe("PusherRoomSocketController reconnect retention", () => {
    let registeredHandlers: RegisteredHandlers | undefined;

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
        registeredHandlers = undefined;
    });

    it("keeps the tab context until the disconnection retention expires", async () => {
        vi.useFakeTimers();

        const controller = createController((handlers) => {
            registeredHandlers = handlers;
        });

        const socket = createSocket({ tabId: "tab-1" });
        await registeredHandlers?.open(socket);

        expect(getContextMap(controller).has("conn-1")).toBe(true);

        await registeredHandlers?.close(socket);
        await flushMicrotasks();

        expect(getContextMap(controller).has("conn-1")).toBe(true);

        vi.advanceTimersByTime(CLIENT_DISCONNECTION_RETENTION_MS - 1);
        expect(getContextMap(controller).has("conn-1")).toBe(true);

        vi.advanceTimersByTime(1);
        await flushMicrotasks();
        expect(getContextMap(controller).has("conn-1")).toBe(false);
    });

    it("delays logical cleanup so a closed transport can still be replaced", async () => {
        vi.useFakeTimers();

        const close = vi.fn();
        const controller = createController(
            (handlers) => {
                registeredHandlers = handlers;
            },
            vi.fn(),
            close,
        );

        const initialSocket = createSocket({ tabId: "tab-1" });
        await registeredHandlers?.open(initialSocket);

        const initialContext = getContextMap(controller).get("conn-1");
        expect(initialContext).toBeDefined();

        await registeredHandlers?.close(initialSocket);
        await flushMicrotasks();

        expect(close).not.toHaveBeenCalled();

        const reconnectSocket = createSocket({ tabId: "tab-1", clientLastReceivedNonce: 0 });
        await registeredHandlers?.open(reconnectSocket);

        vi.advanceTimersByTime(CLIENT_DISCONNECTION_RETENTION_MS);
        await flushMicrotasks();

        expect(close).not.toHaveBeenCalled();
        expect(getContextMap(controller).get("conn-1")).toBe(initialContext);
    });

    it("cancels the scheduled cleanup when the same tab reconnects in time", async () => {
        vi.useFakeTimers();

        const controller = createController((handlers) => {
            registeredHandlers = handlers;
        });

        const initialSocket = createSocket({ tabId: "tab-1" });
        await registeredHandlers?.open(initialSocket);

        const initialContext = getContextMap(controller).get("conn-1");
        expect(initialContext).toBeDefined();

        await registeredHandlers?.close(initialSocket);
        await flushMicrotasks();

        const reconnectSocket = createSocket({ tabId: "tab-1", clientLastReceivedNonce: 0 });
        await registeredHandlers?.open(reconnectSocket);

        vi.advanceTimersByTime(CLIENT_DISCONNECTION_RETENTION_MS);

        expect(getContextMap(controller).has("conn-1")).toBe(true);
    });

    it("creates a fresh context after the retention window expires", async () => {
        vi.useFakeTimers();

        const open = vi.fn();
        const controller = createController((handlers) => {
            registeredHandlers = handlers;
        }, open);

        const initialSocket = createSocket({ tabId: "tab-1" });
        await registeredHandlers?.open(initialSocket);
        await registeredHandlers?.close(initialSocket);
        await flushMicrotasks();

        vi.advanceTimersByTime(CLIENT_DISCONNECTION_RETENTION_MS);
        await flushMicrotasks();

        const reconnectSocket = createSocket({ tabId: "tab-1" });
        await registeredHandlers?.open(reconnectSocket);

        expect(open).toHaveBeenCalledTimes(2);
        expect(getContextMap(controller).get("conn-1")).toBeDefined();
    });

    it("runs logical cleanup when no replacement arrives before retention expires", async () => {
        vi.useFakeTimers();

        const close = vi.fn();
        createController(
            (handlers) => {
                registeredHandlers = handlers;
            },
            vi.fn(),
            close,
        );

        const initialSocket = createSocket({ tabId: "tab-1" });
        await registeredHandlers?.open(initialSocket);
        await registeredHandlers?.close(initialSocket);
        await flushMicrotasks();

        expect(close).not.toHaveBeenCalled();

        vi.advanceTimersByTime(CLIENT_DISCONNECTION_RETENTION_MS);
        await flushMicrotasks();

        expect(close).toHaveBeenCalledTimes(1);
    });

    it("runs logical cleanup immediately on normal client close", async () => {
        vi.useFakeTimers();

        const close = vi.fn();
        const controller = createController(
            (handlers) => {
                registeredHandlers = handlers;
            },
            vi.fn(),
            close,
        );

        const socket = createSocket({ tabId: "tab-1" });
        await registeredHandlers?.open(socket);
        await registeredHandlers?.close(socket, 1000, new TextEncoder().encode("Page unloading").buffer);
        await flushMicrotasks();

        expect(close).toHaveBeenCalledWith(expect.any(PusherWebSocket), 1000, "Page unloading");
        expect(getContextMap(controller).has("conn-1")).toBe(false);

        vi.advanceTimersByTime(CLIENT_DISCONNECTION_RETENTION_MS);
        await flushMicrotasks();

        expect(close).toHaveBeenCalledTimes(1);
    });

    it("queues outgoing messages while a transport is closed and flushes them after replacement", async () => {
        vi.useFakeTimers();

        const controller = createController((handlers) => {
            registeredHandlers = handlers;
        });

        const initialSocket = createSocket({ tabId: "tab-1" });
        await registeredHandlers?.open(initialSocket);

        const wrapper = getContextMap(controller).get("conn-1") as PusherWebSocket;
        wrapper.send({ message: undefined });

        const initialContext = getContextMap(controller).get("conn-1");
        expect(initialContext).toBeDefined();

        await registeredHandlers?.close(initialSocket);
        await flushMicrotasks();

        wrapper.send({ message: undefined });
        expect(getSendMock(initialSocket)).toHaveBeenCalledTimes(1);

        const reconnectSocket = createSocket({ tabId: "tab-1", clientLastReceivedNonce: 1 });
        await registeredHandlers?.open(reconnectSocket);

        expect(getSendMock(reconnectSocket)).toHaveBeenCalledTimes(1);
    });

    it("rejects a reconnect when the previous logical connection is no longer retained", async () => {
        vi.useFakeTimers();

        const open = vi.fn();
        createController((handlers) => {
            registeredHandlers = handlers;
        }, open);

        const reconnectSocket = createSocket({ tabId: "tab-1", clientLastReceivedNonce: 4 });
        await registeredHandlers?.open(reconnectSocket);

        expect(open).not.toHaveBeenCalled();
        expect(getEndMock(reconnectSocket)).toHaveBeenCalledWith(
            1008,
            "Cannot replace socket: previous connection not retained",
        );
    });

    it("lets the wrapper flush queued messages on drain even without an application drain handler", async () => {
        const controller = createController((handlers) => {
            registeredHandlers = handlers;
        });

        const socket = createSocket({ tabId: "tab-1" });
        getSendMock(socket).mockReturnValueOnce(0).mockReturnValue(1);

        await registeredHandlers?.open(socket);

        const wrapper = getContextMap(controller).get("conn-1") as PusherWebSocket;
        wrapper.send({ message: undefined });
        wrapper.send({ message: undefined });

        expect(getSendMock(socket)).toHaveBeenCalledTimes(1);

        await registeredHandlers?.drain(socket);

        expect(getSendMock(socket)).toHaveBeenCalledTimes(3);
    });
});

describe("PusherRoomSocketController transport resume identity", () => {
    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    const canReplace = (controller: PusherRoomSocketController, query: object, retained?: PusherWebSocket) =>
        (
            controller as unknown as {
                canReplaceTransportWithoutUpgrade: (
                    query: object,
                    protocol: string,
                    retained?: PusherWebSocket,
                ) => boolean;
            }
        ).canReplaceTransportWithoutUpgrade(query, "token", retained);

    it("only resumes onto a retained connection with the same token and room", () => {
        const controller = createController(() => {});
        const retained = createPusherWebSocket(createSocket({ token: "token", roomId: "room-id" }));

        expect(canReplace(controller, { roomId: "room-id" }, retained)).toBe(true);
        expect(canReplace(controller, { roomId: "another-room" }, retained)).toBe(false);
        expect(canReplace(controller, { roomId: "room-id" }, undefined)).toBe(false);
    });

    it("refuses a resume from a WorkAdventureWebSocket that never opened a connection here", async () => {
        let handlers: RegisteredHandlers | undefined;
        const controller = createController((h) => {
            handlers = h;
        });

        const initialSocket = createSocket({ connectionId: "current" });
        await handlers?.open(initialSocket);
        const retained = getContextMap(controller).get("current");

        const stale = createSocket({ connectionId: "stale", clientLastReceivedNonce: 7 });
        await handlers?.open(stale);
        expect(getEndMock(stale)).toHaveBeenCalledWith(1008, "Cannot replace socket: previous connection not retained");
        expect(getContextMap(controller).get("current")).toBe(retained);

        const legitimate = createSocket({ connectionId: "current", clientLastReceivedNonce: 0 });
        await handlers?.open(legitimate);
        expect(getEndMock(legitimate)).not.toHaveBeenCalled();
        expect(getEndMock(initialSocket)).toHaveBeenCalledWith(1008, "Replaced by a reconnected socket");
    });

    it("does not retain a connection from a front that sends no connection id", async () => {
        vi.useFakeTimers();
        let handlers: RegisteredHandlers | undefined;
        const close = vi.fn();
        const controller = createController(
            (h) => {
                handlers = h;
            },
            vi.fn(),
            close,
        );

        const socket = createSocket({ connectionId: undefined });
        await handlers?.open(socket);
        expect(getContextMap(controller).size).toBe(0);

        await handlers?.close(socket, 1006);
        await flushMicrotasks();
        expect(close).toHaveBeenCalledTimes(1);

        const resume = createSocket({ connectionId: undefined, clientLastReceivedNonce: 0 });
        await handlers?.open(resume);
        expect(getEndMock(resume)).toHaveBeenCalledWith(
            1008,
            "Cannot replace socket: previous connection not retained",
        );
    });

    it("rejects a replacement socket carrying a different connection id", () => {
        const previous = createPusherWebSocket(createSocket({ connectionId: "a" }));
        const replacement = createSocket({ connectionId: "b" });

        expect(previous.replaceSocket(replacement, 0)).toBe(false);
        expect(getEndMock(replacement)).toHaveBeenCalledWith(1008, "Cannot replace socket: connection id mismatch");
    });
});

describe("PusherWebSocket backpressure", () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("records messages without attempting new sends while waiting for drain", () => {
        const socket = createSocket();
        getSendMock(socket).mockReturnValueOnce(0).mockReturnValue(1);
        const wrapper = createPusherWebSocket(socket);

        expect(wrapper.send({ message: undefined })).toBe(0);
        expect(wrapper.send({ message: undefined })).toBe(0);
        expect(getSendMock(socket)).toHaveBeenCalledTimes(1);

        wrapper.handleDrain();

        expect(getSendMock(socket)).toHaveBeenCalledTimes(3);
    });

    it("keeps the drain tracker at the last accepted nonce when drain hits backpressure again", () => {
        const socket = createSocket();
        getSendMock(socket).mockReturnValueOnce(0).mockReturnValueOnce(1).mockReturnValueOnce(0).mockReturnValue(1);
        const wrapper = createPusherWebSocket(socket);

        wrapper.send({ message: undefined });
        wrapper.send({ message: undefined });
        wrapper.handleDrain();
        wrapper.send({ message: undefined });

        expect(getSendMock(socket)).toHaveBeenCalledTimes(3);

        wrapper.handleDrain();

        expect(getSendMock(socket)).toHaveBeenCalledTimes(5);
    });
});

function createController(
    registerHandlers: (handlers: RegisteredHandlers) => void,
    openHandler: (socket: unknown) => void | Promise<void> = vi.fn(),
    closeHandler: (socket: unknown) => void | Promise<void> = vi.fn(),
) {
    const app = {
        ws: vi.fn((_path: string, handlers: unknown) => {
            registerHandlers(handlers as RegisteredHandlers);
        }),
    };

    const controller = new PusherRoomSocketController(app as never);
    controller.ws("/test", {
        queryValidator: z.object({ tabId: z.string() }) as never,
        upgrade: vi.fn(),
        open: openHandler,
        rejectedOpen: vi.fn(),
        reconnect: vi.fn(),
        message: vi.fn(),
        close: closeHandler,
    });

    return controller;
}

function getContextMap(controller: PusherRoomSocketController): Map<string, unknown> {
    return (controller as unknown as { retainedByConnectionId: Map<string, unknown> }).retainedByConnectionId;
}

function createSocket(overrides: Partial<SocketData> = {}): RawSocket {
    const socketData: SocketData = {
        rejected: false,
        token: "token",
        roomId: "room-id",
        userId: 1,
        userUuid: "user-uuid",
        isLogged: true,
        ipAddress: "127.0.0.1",
        characterTextures: [],
        companionTexture: undefined,
        lastCommandId: undefined,
        tags: [],
        visitCardUrl: null,
        userRoomToken: undefined,
        loginMessages: [],
        activatedInviteUser: undefined,
        applications: null,
        canEdit: false,
        spaceUserId: "space-user-id",
        backConnection: undefined,
        listenedZones: new Set(),
        pusherRoom: undefined,
        spaces: new Set(),
        joinSpacesPromise: new Map(),
        chatID: undefined,
        world: "world",
        currentChatRoomArea: [],
        roomName: "room-name",
        microphoneState: false,
        cameraState: false,
        tabId: "tab-1",
        connectionId: "conn-1",
        attendeesState: false,
        queryAbortControllers: new Map(),
        canRecord: false,
        name: "name",
        viewport: {} as never,
        availabilityStatus: "online" as never,
        ...overrides,
    };

    const sendMock = vi.fn().mockReturnValue(1);

    const endMock = vi.fn();

    return {
        getUserData: vi.fn(() => socketData),
        send: sendMock,
        sendMock,
        ping: vi.fn(),
        end: endMock,
        endMock,
        getBufferedAmount: vi.fn().mockReturnValue(0),
    } as unknown as RawSocket;
}

function createPusherWebSocket(socket: RawSocket): PusherWebSocket {
    return new PusherWebSocket(socket);
}

function getSendMock(socket: RawSocket): ReturnType<typeof vi.fn> {
    return (socket as unknown as { sendMock: ReturnType<typeof vi.fn> }).sendMock;
}

function getEndMock(socket: RawSocket): ReturnType<typeof vi.fn> {
    return (socket as unknown as { endMock: ReturnType<typeof vi.fn> }).endMock;
}

async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}
