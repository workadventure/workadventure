import { get } from "svelte/store";
import { Subject } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadLocale } from "../../../../../i18n/i18n-util.sync";
import { setLocale } from "../../../../../i18n/i18n-svelte";
import { chatVisibilityStore, intentionallyClosedChatDuringMeetingStore } from "../../../../Stores/ChatStore";
import { chatNotificationStore } from "../../../../Stores/ProximityNotificationStore";
import { selectedRoomStore } from "../../../Stores/SelectRoomStore";
import type { IncomingProximityFileTransferOffer, ProximityFileTransferUpdate } from "../ProximityFileTransferService";
import { formatProximityFileTransferRemainingTime } from "../ProximityFileTransferEta";
import { ProximityChatRoom } from "../ProximityChatRoom";

vi.mock("../../../../Phaser/Game/GameManager", () => ({
    gameManager: {
        getCurrentGameScene: () => ({
            playSound: vi.fn(),
        }),
    },
}));
vi.mock("../../../Phaser/Game/GameManager", () => ({
    gameManager: {
        getCurrentGameScene: () => ({
            playSound: vi.fn(),
        }),
    },
}));
vi.mock("../../../../Phaser/Game/GameScene", () => ({}));
vi.mock("../../../Phaser/Game/GameScene", () => ({}));

function createRoom() {
    return new ProximityChatRoom(
        "recipient",
        {
            leaveSpace: vi.fn().mockResolvedValue(undefined),
        } as never,
        {
            newChatMessageWritingStatusStream: new Subject(),
        },
        {
            getPlayers: () => new Map(),
        } as never,
        {
            playBubbleInSound: vi.fn(),
            playBubbleOutSound: vi.fn(),
            playMeetingInSound: vi.fn(),
            playMeetingOutSound: vi.fn(),
        },
        undefined,
        [],
        vi.fn(),
    );
}

function createOffer(): IncomingProximityFileTransferOffer {
    return {
        transferId: "transfer-1",
        fileName: "hello.txt",
        mimeType: "text/plain",
        size: 5,
        messageType: "file",
        characterTextures: [],
        name: "Sender",
        senderSpaceUserId: "sender",
    };
}

describe("ProximityChatRoom file transfers", () => {
    beforeEach(() => {
        loadLocale("en-US");
        setLocale("en-US");
        selectedRoomStore.set(undefined);
        chatVisibilityStore.set(false);
        intentionallyClosedChatDuringMeetingStore.set(false);
        chatNotificationStore.clearAll();
    });

    it("should notify an incoming file transfer request without opening the chat", () => {
        const room = createRoom();

        Reflect.get(room, "addIncomingFileOffer").call(room, createOffer());

        expect(get(room.messages)).toHaveLength(1);
        expect(get(room.hasUnreadMessages)).toBe(true);
        expect(get(room.unreadNotificationCount)).toBe(1);
        expect(get(room.unreadMessagesCount)).toBe(1);
        expect(get(chatNotificationStore)).toMatchObject([
            {
                userName: "Sender",
                message: "sent a file: hello.txt",
                messageId: "transfer-1",
                room,
            },
        ]);
        expect(get(chatVisibilityStore)).toBe(false);
    });

    it("should not count or notify an incoming file transfer request when the room is visible", () => {
        const room = createRoom();
        selectedRoomStore.set(room);
        chatVisibilityStore.set(true);

        Reflect.get(room, "addIncomingFileOffer").call(room, createOffer());

        expect(get(room.messages)).toHaveLength(1);
        expect(get(room.hasUnreadMessages)).toBe(false);
        expect(get(room.unreadNotificationCount)).toBe(0);
        expect(get(room.unreadMessagesCount)).toBe(0);
        expect(get(chatNotificationStore)).toHaveLength(0);
        expect(get(chatVisibilityStore)).toBe(true);
    });

    it("should count an incoming file transfer request without an in-game notification when notifications are muted", () => {
        const room = createRoom();
        room.areNotificationsMuted.set(true);

        Reflect.get(room, "addIncomingFileOffer").call(room, createOffer());

        expect(get(room.hasUnreadMessages)).toBe(true);
        expect(get(room.unreadNotificationCount)).toBe(1);
        expect(get(room.unreadMessagesCount)).toBe(1);
        expect(get(chatNotificationStore)).toHaveLength(0);
        expect(get(chatVisibilityStore)).toBe(false);
    });

    it("should keep a received file available when a later transfer error is received", () => {
        const room = createRoom();
        Reflect.get(room, "addIncomingFileOffer").call(room, createOffer());
        const readyUpdate: ProximityFileTransferUpdate = {
            transferId: "transfer-1",
            state: "ready",
            progress: 1,
            url: "blob:received-file",
        };
        const unavailableUpdate: ProximityFileTransferUpdate = {
            transferId: "transfer-1",
            state: "error",
            progress: 1,
            error: "unavailable",
        };

        Reflect.get(room, "applyFileTransferUpdate").call(room, readyUpdate);
        Reflect.get(room, "applyFileTransferUpdate").call(room, unavailableUpdate);

        const [message] = get(room.messages);
        expect(get(message.content)).toMatchObject({
            url: "blob:received-file",
            mediaState: "ready",
            mediaProgress: 1,
        });
    });

    it("should estimate remaining time only after download progress is stable enough", () => {
        vi.useFakeTimers();
        try {
            const room = createRoom();
            Reflect.get(room, "addIncomingFileOffer").call(room, createOffer());
            vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));

            Reflect.get(room, "applyFileTransferUpdate").call(room, {
                transferId: "transfer-1",
                state: "downloading",
                progress: 0,
            } satisfies ProximityFileTransferUpdate);
            Reflect.get(room, "applyFileTransferUpdate").call(room, {
                transferId: "transfer-1",
                state: "downloading",
                progress: 0.5,
            } satisfies ProximityFileTransferUpdate);

            const [message] = get(room.messages);
            expect(get(message.content).mediaEstimatedRemainingSeconds).toBeUndefined();

            vi.setSystemTime(new Date("2024-01-01T00:00:02.000Z"));
            Reflect.get(room, "applyFileTransferUpdate").call(room, {
                transferId: "transfer-1",
                state: "downloading",
                progress: 0.04,
            } satisfies ProximityFileTransferUpdate);
            expect(get(message.content).mediaEstimatedRemainingSeconds).toBeUndefined();

            Reflect.get(room, "applyFileTransferUpdate").call(room, {
                transferId: "transfer-1",
                state: "downloading",
                progress: 0.5,
            } satisfies ProximityFileTransferUpdate);

            expect(get(message.content)).toMatchObject({
                mediaState: "loading",
                mediaProgress: 0.5,
                mediaEstimatedRemainingSeconds: 2,
            });
        } finally {
            vi.useRealTimers();
        }
    });

    it("should clear estimated remaining time when a transfer stops loading", () => {
        vi.useFakeTimers();
        try {
            const room = createRoom();
            Reflect.get(room, "addIncomingFileOffer").call(room, createOffer());
            vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
            Reflect.get(room, "applyFileTransferUpdate").call(room, {
                transferId: "transfer-1",
                state: "downloading",
                progress: 0,
            } satisfies ProximityFileTransferUpdate);
            vi.setSystemTime(new Date("2024-01-01T00:00:02.000Z"));
            Reflect.get(room, "applyFileTransferUpdate").call(room, {
                transferId: "transfer-1",
                state: "downloading",
                progress: 0.5,
            } satisfies ProximityFileTransferUpdate);

            const [message] = get(room.messages);
            expect(get(message.content).mediaEstimatedRemainingSeconds).toBe(2);

            Reflect.get(room, "applyFileTransferUpdate").call(room, {
                transferId: "transfer-1",
                state: "error",
                progress: 0.5,
                error: "unavailable",
            } satisfies ProximityFileTransferUpdate);

            expect(get(message.content).mediaEstimatedRemainingSeconds).toBeUndefined();
        } finally {
            vi.useRealTimers();
        }
    });

    it("should mark an incoming file transfer request as refused locally", async () => {
        const room = createRoom();
        Reflect.get(room, "addIncomingFileOffer").call(room, createOffer());
        const [message] = get(room.messages);

        await Reflect.get(message, "refuseAttachment")?.();

        expect(get(message.content)).toMatchObject({
            mediaState: "refused",
            mediaProgress: 0,
        });
    });

    it("should show a local preparing state while outgoing files are secured before offer emission", async () => {
        vi.stubGlobal("URL", { createObjectURL: vi.fn().mockReturnValue("blob:transfer-1") });
        const room = createRoom();
        let resolveOffers!: (value: unknown[]) => void;
        const offersPromise = new Promise<unknown[]>((resolve) => {
            resolveOffers = resolve;
        });
        Reflect.set(room, "fileTransferService", {
            createOutgoingOffers: () => offersPromise,
        });
        const file = new File(["hello"], "hello.txt", { type: "text/plain" });

        const sendPromise = room.sendFiles(createFileList(file));

        const [message] = get(room.messages);
        expect(get(message.content)).toMatchObject({
            body: "hello.txt",
            mediaState: "loading",
            mediaProgress: 0,
        });
        resolveOffers([
            {
                transferId: "transfer-1",
                file,
                messageType: "file",
                recipients: [],
            },
        ]);
        await sendPromise;
        vi.unstubAllGlobals();
    });
});

describe("formatProximityFileTransferRemainingTime", () => {
    it("should format valid remaining times with stable short units", () => {
        expect(formatProximityFileTransferRemainingTime(45)).toBe("45 s");
        expect(formatProximityFileTransferRemainingTime(61)).toBe("2 min");
        expect(formatProximityFileTransferRemainingTime(3_601)).toBe("2 h");
    });

    it("should ignore invalid remaining times", () => {
        expect(formatProximityFileTransferRemainingTime(0)).toBeUndefined();
        expect(formatProximityFileTransferRemainingTime(Number.NaN)).toBeUndefined();
        expect(formatProximityFileTransferRemainingTime(Number.POSITIVE_INFINITY)).toBeUndefined();
    });
});

function createFileList(file: File): FileList {
    return new SingleFileList(file);
}

class SingleFileList implements FileList {
    [index: number]: File;
    readonly length = 1;

    constructor(file: File) {
        this[0] = file;
    }

    item(index: number): File | null {
        return index === 0 ? this[0] : null;
    }

    [Symbol.iterator](): ArrayIterator<File> {
        return [this[0]][Symbol.iterator]();
    }
}
