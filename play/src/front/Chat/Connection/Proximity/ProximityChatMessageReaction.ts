import { MapStore } from "@workadventure/store-utils";
import type { Readable } from "svelte/store";
import { readable, writable } from "svelte/store";
import type { ChatMessageReaction, ChatUser } from "../ChatConnection";
import ReactionIcon from "../../Components/Room/ReactionIcon.svelte";

/**
 * One emoji on one bubble message. Users are keyed by space user id: anonymous users have no chat id.
 */
export class ProximityChatMessageReaction implements ChatMessageReaction {
    readonly users = new MapStore<string, ChatUser>();
    readonly reacted = writable(false);
    readonly canReact: Readable<boolean> = readable(true);
    constructor(
        readonly key: string,
        readonly myChatId: string,
        private readonly toggle: (key: string) => void,
    ) {}

    get component() {
        return { component: ReactionIcon, props: { key: this.key } };
    }

    react(): void {
        this.toggle(this.key);
    }

    setUser(userId: string, user: ChatUser, added: boolean): void {
        if (added) {
            this.users.set(userId, user);
        } else {
            this.users.delete(userId);
        }
        if (userId === this.myChatId) {
            this.reacted.set(added);
        }
    }
}

/**
 * Applies a reaction added or removed by `userId` to the reactions of a message.
 * An emptied reaction is dropped so that the message shows no "0" counter.
 */
export function applyProximityReaction(
    reactions: MapStore<string, ChatMessageReaction>,
    key: string,
    userId: string,
    user: ChatUser,
    added: boolean,
    myChatId: string,
    toggle: (key: string) => void,
): void {
    const existing = reactions.get(key);
    const reaction =
        existing instanceof ProximityChatMessageReaction
            ? existing
            : added
              ? new ProximityChatMessageReaction(key, myChatId, toggle)
              : undefined;
    if (!reaction) {
        return;
    }
    reaction.setUser(userId, user, added);
    // Message.svelte filters out reactions without users when the map changes, so add the user first.
    if (reaction !== existing) {
        reactions.set(key, reaction);
    }
    if (reaction.users.size === 0) {
        reactions.delete(key);
    }
}
