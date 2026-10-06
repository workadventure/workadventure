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
        selectedChatMessageToReply: writable(null),
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

    describe("sendMessage", () => {
        it("should send the Markdown as HTML too, so that other Matrix clients show the formatting", () => {
            const room = Object.create(MatrixChatRoom.prototype) as MatrixChatRoom;
            const sendMessage = vi.fn(() => Promise.resolve());
            Object.assign(room, { matrixRoom: { roomId: "!room:matrix.org", client: { sendMessage } } });

            room.sendMessage("**bold** and `code`");

            expect(sendMessage).toHaveBeenCalledWith("!room:matrix.org", {
                msgtype: "m.text",
                body: "**bold** and `code`",
                format: "org.matrix.custom.html",
                formatted_body: "<p><strong>bold</strong> and <code>code</code></p>\n",
            });
        });
    });

    describe("sendFiles", () => {
        it("should reject when an upload fails, so that the chat can tell the user", async () => {
            const room = Object.create(MatrixChatRoom.prototype) as MatrixChatRoom;
            const sendMessage = vi.fn();
            Object.assign(room, {
                matrixRoom: {
                    roomId: "!room:matrix.org",
                    hasEncryptionStateEvent: () => false,
                    client: {
                        uploadContent: () => Promise.reject(new Error("M_TOO_LARGE")),
                        sendMessage,
                    },
                },
            });
            // jsdom has no DataTransfer to build a real FileList.
            const files = [new File(["hello"], "hello.txt")] as unknown as FileList;

            await expect(room.sendFiles(files)).rejects.toThrow("M_TOO_LARGE");
            expect(sendMessage).not.toHaveBeenCalled();
        });
    });
});
