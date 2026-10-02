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
});
