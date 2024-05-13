import { MapStore } from "@workadventure/store-utils";
import { get, Writable, writable, Readable } from "svelte/store";
import { WaLink } from "../Xmpp/Lib/Plugin";
import { MessageType, ReplyMessage, User } from "../Xmpp/AbstractRoom";

export class Message {
    public readonly delivered: Writable<boolean>;
    public readonly error: Writable<boolean>;
    private readonly _reactions: MapStore<string, Writable<string[]>>;

    constructor(
        public readonly body: string,
        public readonly name: string,
        public readonly jid: string,
        public readonly time: Date,
        public readonly id: string,
        delivered: boolean,
        error: boolean,
        public readonly from: string,
        public readonly type: MessageType,
        public readonly targetMessageReply?: ReplyMessage,
        private targetMessageReact?: Map<string, number>,
        public readonly links?: WaLink[],
        public readonly mentions?: User[]
    ) {
        this.delivered = writable(delivered);
        this.error = writable(error);
        this._reactions = new MapStore<string, Writable<string[]>>();
    }

    public setDelivered(value: boolean) {
        this.delivered.set(value);
    }

    public setError(value: boolean) {
        if (!get(this.delivered)) {
            this.error.set(value);
        }
    }

    public setReactions(value: Map<string, string[]>) {
        this._reactions.clear();
        value.forEach((jids, reaction) => {
            this._reactions.set(reaction, writable(jids));
        });
    }

    public addReaction(emoji: string, jid: string) {
        const reactions = this._reactions.get(emoji);
        if (reactions && get(reactions)) {
            reactions.set([...get(reactions), jid]);
        } else {
            this._reactions.set(emoji, writable([jid]));
        }
    }

    public removeReaction(emoji: string, jid: string) {
        const reactions = this._reactions.get(emoji);
        if (reactions && get(reactions)) {
            const reactionsUpdated = [...get(reactions)].filter((jid_) => jid_ !== jid);
            if (reactionsUpdated.length > 0) {
                reactions.set(reactionsUpdated);
            } else {
                this._reactions.delete(emoji);
            }
        }
    }

    get reactions(): MapStore<string, Readable<string[]>> {
        return this._reactions;
    }
}
