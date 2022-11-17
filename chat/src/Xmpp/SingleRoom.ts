import {AbstractRoom} from "./AbstractRoom";
import {XmppClient} from "./XmppClient";
import {ParsedJID} from "stanza/JID";
import {Writable, writable} from "svelte/types/runtime/store";

const _VERBOSE = true;

export class SingleRoom extends AbstractRoom {
    private canLoadOlderMessagesStore: Writable<boolean>;
    private showDisabledLoadOlderMessagesStore: Writable<boolean>;
    private readyStore: Writable<boolean>;

    constructor(
        xmppClient: XmppClient,
        public readonly name: string,
        protected roomJid: ParsedJID,
        public type: string,
        public subscribe: boolean
    ) {
        super(xmppClient, _VERBOSE);

        this.canLoadOlderMessagesStore = writable<boolean>(true);
        this.showDisabledLoadOlderMessagesStore = writable<boolean>(false);
        this.readyStore = writable<boolean>(type === "default");
    }
}