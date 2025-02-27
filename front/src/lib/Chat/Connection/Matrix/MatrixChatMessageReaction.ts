import { EventType, MatrixEvent, RelationType, Room } from "matrix-js-sdk";
import { MapStore } from "@workadventure/store-utils";
import { get, writable, Writable } from "svelte/store";
import { ChatMessageReaction, ChatUser } from "../ChatConnection";
import { chatUserFactory } from "./MatrixChatUser";

type EventId = string;
type ChatUserWithEventId = ChatUser & { eventId: EventId };

export class MatrixChatMessageReaction implements ChatMessageReaction {
    key: string;
    messageId: string;
    users: MapStore<string, ChatUserWithEventId>;
    reacted: Writable<boolean>;

    constructor(private matrixRoom: Room, event: MatrixEvent) {
        const relation = event.getRelation();
        if (relation === null || relation.rel_type !== "m.annotation") {
            throw Error("Wrong matrix event object for MessageReaction");
        }

        const reactionKey = relation.key;
        const targetEventId = relation.event_id;

        if (reactionKey === undefined || targetEventId === undefined) {
            throw Error("ReactionKey is undefined or event_id is undefined");
        }
        this.key = reactionKey;
        this.messageId = targetEventId;
        this.users = new MapStore<string, ChatUserWithEventId>();
        this.reacted = writable(false);
        this.addUser(event.getSender(), event.getId());
    }

    public addUser(userId: string | undefined, userReactionEventId: string | undefined) {
        if (userId === undefined || userReactionEventId === undefined) {
            return;
        }
        if (this.users.get(userId) !== undefined) {
            return;
        }
        const user = this.matrixRoom.client.getUser(userId);
        if (user) {
            this.users.set(user.userId, {
                ...chatUserFactory(user, this.matrixRoom.client),
                eventId: userReactionEventId,
            });
            this.reacted.set(this.users.get(this.matrixRoom.myUserId) !== undefined);
        }
    }

    public removeUser(userId: string) {
        this.users.delete(userId);
        if (get(this.reacted) && userId === this.matrixRoom.myUserId) {
            this.reacted.set(false);
        }
    }

    react() {
        const userWithReactionEventId = this.users.get(this.matrixRoom.myUserId);
        if (userWithReactionEventId === undefined) {
            this.sendMyReaction().catch((error) => console.error(error));
        } else {
            this.removeMyReaction(userWithReactionEventId.eventId).catch((error) => console.error(error));
        }
    }

    private async sendMyReaction() {
        try {
            await this.matrixRoom.client.sendEvent(this.matrixRoom.roomId, EventType.Reaction, {
                "m.relates_to": { event_id: this.messageId, rel_type: RelationType.Annotation, key: this.key },
            });
        } catch (error) {
            console.error(error);
        }
    }

    private async removeMyReaction(myReactionEventId: string) {
        try {
            await this.matrixRoom.client
                .redactEvent(this.matrixRoom.roomId, myReactionEventId)
                .catch((error) => console.error(error));
        } catch (error) {
            console.error(error);
        }
    }
}
