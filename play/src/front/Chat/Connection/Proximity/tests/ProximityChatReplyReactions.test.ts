import { get } from "svelte/store";
import { Subject } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapStore } from "@workadventure/store-utils";
import { loadLocale } from "../../../../../i18n/i18n-util.sync";
import { setLocale } from "../../../../../i18n/i18n-svelte";
import { selectedChatMessageToReply } from "../../../Stores/ChatStore";
import { blackListManager } from "../../../../WebRtc/BlackListManager";
import type { SpaceUserExtended } from "../../../../Space/SpaceInterface";
import type { ChatMessage, ChatMessageReaction, ChatUser } from "../../ChatConnection";
import { ProximityChatMessage, ProximityChatRoom } from "../ProximityChatRoom";
import { applyProximityReaction } from "../ProximityChatMessageReaction";

vi.mock("../../../../Phaser/Game/GameManager", () => ({
    gameManager: { getCurrentGameScene: () => ({ playSound: vi.fn() }) },
}));
vi.mock("../../../Phaser/Game/GameManager", () => ({
    gameManager: { getCurrentGameScene: () => ({ playSound: vi.fn() }) },
}));
vi.mock("../../../../Phaser/Game/GameScene", () => ({}));
vi.mock("../../../Phaser/Game/GameScene", () => ({}));

const ME = "me";

function createRoom() {
    const room = new ProximityChatRoom(
        "bubble",
        "Bubble",
        "default",
        ME,
        { leaveSpace: vi.fn().mockResolvedValue(undefined) } as never,
        { newChatMessageWritingStatusStream: new Subject() },
        { getPlayers: () => new Map() } as never,
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
    const emitPublicMessage = vi.fn();
    Reflect.set(room, "_space", { emitPublicMessage });
    const user = (spaceUserId: string, name: string) =>
        [
            spaceUserId,
            {
                spaceUserId,
                uuid: `uuid-${spaceUserId}`,
                name,
                tags: [],
                reactiveUser: {},
            } as unknown as SpaceUserExtended,
        ] as const;
    Reflect.set(room, "users", new Map([user(ME, "Me"), user("alice", "Alice"), user("bob", "Bob")]));
    return { room, emitPublicMessage };
}

function receive(room: ProximityChatRoom, sender: string, body: string, id?: string, quote?: object) {
    Reflect.get(room, "addNewMessage").call(room, body, sender, [], "", id, quote);
}

function receiveReaction(room: ProximityChatRoom, sender: string, messageId: string, reaction: string, added = true) {
    Reflect.get(room, "applyRemoteReaction").call(room, sender, { messageId, reaction, added });
}

function reactionUsers(message: ChatMessage, key: string): string[] {
    return [...(message.reactions.get(key)?.users.keys() ?? [])];
}

describe("applyProximityReaction", () => {
    const user = (chatId: string) => ({ chatId }) as ChatUser;

    it("counts two users on the same emoji, then drops the emoji when the last one removes it", () => {
        const reactions = new MapStore<string, ChatMessageReaction>();
        applyProximityReaction(reactions, "👍", "alice", user("alice"), true, ME, vi.fn());
        applyProximityReaction(reactions, "👍", ME, user(ME), true, ME, vi.fn());

        expect(reactions.get("👍")?.users.size).toBe(2);
        expect(get(reactions.get("👍")!.reacted)).toBe(true);

        applyProximityReaction(reactions, "👍", ME, user(ME), false, ME, vi.fn());
        expect(get(reactions.get("👍")!.reacted)).toBe(false);

        applyProximityReaction(reactions, "👍", "alice", user("alice"), false, ME, vi.fn());
        expect(reactions.has("👍")).toBe(false);
    });

    it("adds a new emoji to the map only once it has its first user", () => {
        // Message.svelte drops reactions without users whenever the map changes.
        const reactions = new MapStore<string, ChatMessageReaction>();
        const sizesSeen: number[] = [];
        const unsubscribe = reactions.subscribe(($reactions) =>
            $reactions.forEach((reaction) => sizesSeen.push(reaction.users.size)),
        );
        applyProximityReaction(reactions, "👍", "alice", user("alice"), true, ME, vi.fn());
        unsubscribe();

        expect(sizesSeen).toEqual([1]);
    });

    it("ignores the removal of a reaction nobody added", () => {
        const reactions = new MapStore<string, ChatMessageReaction>();
        applyProximityReaction(reactions, "👍", "alice", user("alice"), false, ME, vi.fn());
        expect(reactions.size).toBe(0);
    });
});

describe("ProximityChatRoom reactions and replies", () => {
    beforeEach(() => {
        loadLocale("en-US");
        setLocale("en-US");
        selectedChatMessageToReply.set(null);
    });

    it("keeps the sender's id so that reactions from others land on the message", () => {
        const { room } = createRoom();
        receive(room, "alice", "Lunch at noon?", "message-1");

        receiveReaction(room, "alice", "message-1", "👍");
        receiveReaction(room, "bob", "message-1", "👍");
        receiveReaction(room, "bob", "message-1", "🎉");
        receiveReaction(room, "bob", "message-1", "🎉", false);

        const [message] = get(room.messages);
        expect(message.id).toBe("message-1");
        expect(reactionUsers(message, "👍")).toEqual(["alice", "bob"]);
        expect(message.reactions.has("🎉")).toBe(false);
    });

    it("toggles my reaction locally and tells the others", () => {
        const { room, emitPublicMessage } = createRoom();
        receive(room, "alice", "Lunch at noon?", "message-1");
        const [message] = get(room.messages);

        message.addReaction("👍").catch(() => undefined);
        expect(reactionUsers(message, "👍")).toEqual([ME]);
        expect(get(message.reactions.get("👍")!.reacted)).toBe(true);

        message.reactions.get("👍")!.react();
        expect(message.reactions.has("👍")).toBe(false);

        expect(emitPublicMessage.mock.calls.map(([event]) => event)).toEqual([
            {
                $case: "spaceMessageReaction",
                spaceMessageReaction: { messageId: "message-1", reaction: "👍", added: true },
            },
            {
                $case: "spaceMessageReaction",
                spaceMessageReaction: { messageId: "message-1", reaction: "👍", added: false },
            },
        ]);
    });

    it("ignores reactions from a blocked user", () => {
        const { room } = createRoom();
        receive(room, "alice", "Lunch at noon?", "message-1");
        blackListManager.blackList("uuid-bob");

        receiveReaction(room, "bob", "message-1", "👍");

        expect(get(room.messages)[0].reactions.size).toBe(0);
        blackListManager.cancelBlackList("uuid-bob");
    });

    it("does not offer reactions on a message from an older client, which sends no id", () => {
        const { room } = createRoom();
        receive(room, "alice", "Lunch at noon?");

        const [message] = get(room.messages);
        expect(get(message.canReact)).toBe(false);
        receiveReaction(room, "bob", message.id, "👍");
        expect(message.reactions.size).toBe(0);
    });

    it("offers neither reactions nor replies on a message once I left its bubble", () => {
        const { room, emitPublicMessage } = createRoom();
        receive(room, "alice", "Lunch at noon?", "message-1");
        const message = get(room.messages)[0];
        message.addReaction("👍").catch(() => undefined);
        emitPublicMessage.mockClear();

        if (!(message instanceof ProximityChatMessage)) throw new Error("not a bubble message");
        message.leaveConversation();

        expect(get(message.canReact)).toBe(false);
        expect(get(message.canReply)).toBe(false);
        expect(get(message.reactions.get("👍")!.canReact)).toBe(false);
        message.addReaction("🎉").catch(() => undefined);
        message.reactions.get("👍")!.react();
        expect(emitPublicMessage).not.toHaveBeenCalled();
        expect(reactionUsers(message, "👍")).toEqual([ME]);
    });

    it("sends the quoted message's id and excerpt with a reply, and shows the quote", () => {
        const { room, emitPublicMessage } = createRoom();
        receive(room, "alice", "Lunch at noon?", "message-1");
        selectedChatMessageToReply.set(get(room.messages)[0]);

        room.sendMessage("Agreed");

        const reply = get(room.messages)[1];
        expect(reply.quotedMessage?.isQuotedMessage).toBe(true);
        expect(get(reply.quotedMessage!.content).body).toBe("Lunch at noon?");
        expect(get(selectedChatMessageToReply)).toBeNull();
        expect(emitPublicMessage.mock.calls[0][0].spaceMessage).toMatchObject({
            message: "Agreed",
            id: reply.id,
            quote: { messageId: "message-1", excerpt: "Lunch at noon?", senderName: "Alice" },
        });
    });

    it("shows the excerpt when the quoted message was sent before I joined", () => {
        const { room } = createRoom();
        receive(room, "bob", "Agreed", "message-2", {
            messageId: "message-1",
            excerpt: "Lunch at noon?",
            senderName: "Alice",
        });

        const quoted = get(room.messages)[0].quotedMessage!;
        expect(get(quoted.content).body).toBe("Lunch at noon?");
        expect(quoted.sender?.username).toBe("Alice");
    });
});
