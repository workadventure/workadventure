import type { MatrixEvent, RoomMember, RoomState } from "matrix-js-sdk";
import { describe, expect, it, vi } from "vitest";
import { get, readable, writable } from "svelte/store";
import { MatrixChatRoom } from "../MatrixChatRoom";

vi.mock("../../../../Phaser/Game/GameManager", () => {
    return {
        gameManager: {
            getCurrentGameScene: () => ({}),
        },
    };
});

// Importing the real MatrixChatRoom (unlike MatrixChatConnection.test.ts, which mocks it)
// drags GameScene in, whose module graph cannot initialize in a unit test.
vi.mock("../../../../Phaser/Game/GameScene", () => {
    return {
        GameScene: class {},
    };
});

vi.mock("../../../../Phaser/Entity/CharacterLayerManager", () => {
    return {
        CharacterLayerManager: {
            wokaBase64(): Promise<string> {
                return Promise.resolve("");
            },
        },
    };
});

vi.mock(
    "../../../../Enum/EnvironmentVariable.ts",
    () => import("../../../../../../tests/front/mocks/frontEnvironmentVariableMock"),
);

vi.mock("../../../Stores/ChatStore.ts", () => {
    return {
        selectedRoomStore: writable(undefined),
    };
});

describe("MatrixChatRoom", () => {
    describe("onRoomNewMember", () => {
        const createMemberStub = (userId: string) =>
            ({
                userId,
                name: userId,
                membership: "join",
                powerLevel: 0,
                on: vi.fn(),
                off: vi.fn(),
            }) as unknown as RoomMember;

        // Building a full MatrixChatRoom needs a heavy Room mock: create a bare instance
        // with only the state onRoomNewMember touches.
        const createRoomStub = () => {
            const room = Object.create(MatrixChatRoom.prototype) as MatrixChatRoom;
            Object.assign(room, {
                members: writable([]),
                userProviderMergerStore: readable(undefined),
                matrixRoom: {
                    client: {
                        baseUrl: "https://matrix.example.com",
                        getUser: () => null,
                        getUserId: () => "@me:matrix.org",
                    },
                },
            });
            room["refreshRoomType"] = vi.fn();
            room["refreshJoinedMemberCount"] = vi.fn();
            return room;
        };

        it("should not append a duplicate wrapper when a membership event for a known member is re-emitted", () => {
            const room = createRoomStub();
            const member = createMemberStub("@alice:matrix.org");

            room["onRoomNewMember"]({} as MatrixEvent, {} as RoomState, member);
            room["onRoomNewMember"]({} as MatrixEvent, {} as RoomState, member);

            expect(get(room.members)).toHaveLength(1);
        });

        it("should append distinct members", () => {
            const room = createRoomStub();

            room["onRoomNewMember"]({} as MatrixEvent, {} as RoomState, createMemberStub("@alice:matrix.org"));
            room["onRoomNewMember"]({} as MatrixEvent, {} as RoomState, createMemberStub("@bob:matrix.org"));

            expect(get(room.members)).toHaveLength(2);
        });
    });

    describe("getReadMarker", () => {
        const createRoomStub = (receipt: { eventId: string; data: { ts: number } } | null, lastEventId: string) => {
            const getReadReceiptForUserId = vi.fn(() => receipt);
            const room = Object.create(MatrixChatRoom.prototype) as MatrixChatRoom;
            Object.assign(room, {
                matrixRoom: {
                    client: { getUserId: () => "@me:matrix.org" },
                    getReadReceiptForUserId,
                    getLastLiveEvent: () => ({ getId: () => lastEventId }),
                },
            });
            return { room, getReadReceiptForUserId };
        };

        it("returns the event and time of my server-side read receipt", () => {
            const { room, getReadReceiptForUserId } = createRoomStub({ eventId: "$a", data: { ts: 1000 } }, "$z");

            expect(room.getReadMarker()).toEqual({ eventId: "$a", timestamp: 1000 });
            // Synthesized receipts are local echoes of my own sends, not reading.
            expect(getReadReceiptForUserId).toHaveBeenCalledWith("@me:matrix.org", true);
        });

        it("returns undefined when I have read up to the last event", () => {
            expect(createRoomStub({ eventId: "$z", data: { ts: 1000 } }, "$z").room.getReadMarker()).toBeUndefined();
        });

        it("returns undefined when I never sent a receipt", () => {
            expect(createRoomStub(null, "$z").room.getReadMarker()).toBeUndefined();
        });
    });
    describe("room type", () => {
        // A bare instance with only what getMatrixRoomType reads: a room of two members, not marked as a
        // direct message anywhere, with or without an m.room.name.
        const createRoomStub = (name: string | undefined) => {
            const room = Object.create(MatrixChatRoom.prototype) as MatrixChatRoom;
            const nameEvent = name === undefined ? null : { getContent: () => ({ name }) };
            Object.assign(room, {
                id: "!room:matrix.org",
                matrixRoom: {
                    getDMInviter: () => undefined,
                    getJoinedMemberCount: () => 1,
                    getInvitedMemberCount: () => 1,
                    getMembers: () => [],
                    currentState: { getStateEvents: () => [] },
                    client: { getAccountData: () => undefined },
                    getLiveTimeline: () => ({
                        getState: () => ({
                            getStateEvents: (type: string) => (type === "m.room.name" ? nameEvent : []),
                        }),
                    }),
                },
            });
            return room as unknown as { getMatrixRoomType: () => "direct" | "multiple" };
        };

        it("keeps a named group room with two members a group room", () => {
            expect(createRoomStub("Budget 2027").getMatrixRoomType()).toBe("multiple");
        });

        it("still files an unnamed, unmarked two-person room as a direct message", () => {
            expect(createRoomStub(undefined).getMatrixRoomType()).toBe("direct");
        });
    });
});
