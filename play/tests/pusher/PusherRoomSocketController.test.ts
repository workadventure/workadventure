import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import { CLIENT_DISCONNECTION_RETENTION_MS } from "../../src/pusher/enums/EnvironmentVariable";
import type { SocketData } from "../../src/pusher/models/Websocket/SocketData";
import { PusherRoomSocketController } from "../../src/pusher/services/PusherRoomSocketController";
import type { RawSocket } from "../../src/pusher/services/PusherWebSocket";

type RegisteredHandlers = {
    open: (socket: unknown) => void | Promise<void>;
    close: (socket: unknown) => void | Promise<void>;
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
        await registeredHandlers?.open(socket as never);

        expect(getContextMap(controller).has("tab-1")).toBe(true);

        await registeredHandlers?.close(socket as never);
        await flushMicrotasks();

        expect(getContextMap(controller).has("tab-1")).toBe(true);

        vi.advanceTimersByTime(CLIENT_DISCONNECTION_RETENTION_MS - 1);
        expect(getContextMap(controller).has("tab-1")).toBe(true);

        vi.advanceTimersByTime(1);
        expect(getContextMap(controller).has("tab-1")).toBe(false);
    });

    it("cancels the scheduled cleanup when the same tab reconnects in time", async () => {
        vi.useFakeTimers();

        const controller = createController((handlers) => {
            registeredHandlers = handlers;
        });

        const initialSocket = createSocket({ tabId: "tab-1" });
        await registeredHandlers?.open(initialSocket as never);

        const initialContext = getContextMap(controller).get("tab-1");
        expect(initialContext).toBeDefined();
        initialContext!.clientLastReceivedNonce = 0;

        await registeredHandlers?.close(initialSocket as never);
        await flushMicrotasks();

        const reconnectSocket = createSocket({ tabId: "tab-1" });
        await registeredHandlers?.open(reconnectSocket as never);

        vi.advanceTimersByTime(CLIENT_DISCONNECTION_RETENTION_MS);

        expect(getContextMap(controller).has("tab-1")).toBe(true);
    });

    it("creates a fresh context after the retention window expires", async () => {
        vi.useFakeTimers();

        const open = vi.fn();
        const controller = createController((handlers) => {
            registeredHandlers = handlers;
        }, open);

        const initialSocket = createSocket({ tabId: "tab-1" });
        await registeredHandlers?.open(initialSocket as never);
        await registeredHandlers?.close(initialSocket as never);
        await flushMicrotasks();

        vi.advanceTimersByTime(CLIENT_DISCONNECTION_RETENTION_MS);

        const reconnectSocket = createSocket({ tabId: "tab-1" });
        await registeredHandlers?.open(reconnectSocket as never);

        expect(open).toHaveBeenCalledTimes(2);
        expect(getContextMap(controller).get("tab-1")?.socket).toBeDefined();
    });
});

function createController(
    registerHandlers: (handlers: RegisteredHandlers) => void,
    openHandler: (socket: unknown) => void | Promise<void> = vi.fn(),
    closeHandler: (socket: unknown) => void | Promise<void> = vi.fn()
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
        open: openHandler as never,
        rejectedOpen: vi.fn(),
        message: vi.fn(),
        close: closeHandler as never,
    });

    return controller;
}

function getContextMap(
    controller: PusherRoomSocketController
): Map<string, { socket: unknown; clientLastReceivedNonce?: number }> {
    return (
        controller as unknown as { contextByTabKey: Map<string, { socket: unknown; clientLastReceivedNonce?: number }> }
    ).contextByTabKey;
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
        attendeesState: false,
        queryAbortControllers: new Map(),
        canRecord: false,
        name: "name",
        viewport: {} as never,
        availabilityStatus: "online" as never,
        ...overrides,
    };

    return {
        getUserData: vi.fn(() => socketData),
        send: vi.fn().mockReturnValue(1),
        ping: vi.fn(),
        end: vi.fn(),
        getBufferedAmount: vi.fn().mockReturnValue(0),
    } as unknown as RawSocket;
}

async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}
