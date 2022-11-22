import { AbstractRoom, Message, MessageType, User } from "./AbstractRoom";
import { XmppClient } from "./XmppClient";
import { ParsedJID } from "stanza/JID";
import { get, Writable, writable, derived } from "svelte/store";
import { v4 as uuid } from "uuid";
import { userStore } from "../Stores/LocalUserStore";
import { mucRoomsStore } from "../Stores/MucRoomsStore";
import { ChatState } from "stanza/Constants";
import { ChatStateMessage, JID } from "stanza";
import { filesUploadStore, mentionsUserStore } from "../Stores/ChatStore";
import { fileMessageManager } from "../Services/FileMessageManager";
import * as StanzaConstants from "stanza/Constants";
import { UserList } from "./MucRoom";
import * as StanzaProtocol from "stanza/protocol";

const _VERBOSE = true;

export class SingleRoom extends AbstractRoom {
    private showDisabledLoadOlderMessagesStore: Writable<boolean>;
    private subscriptionAccepted = false;

    constructor(xmppClient: XmppClient, public readonly user: User, protected userJid: ParsedJID) {
        super(xmppClient, _VERBOSE);

        this.showDisabledLoadOlderMessagesStore = writable<boolean>(false);
    }

    protected console(text: string) {
        if (_VERBOSE) {
            console.warn(`[XMPP]%c[SR](${this.name})%c ${text}`, "color: LightGreen;", "color: inherit;");
        }
    }

    get recipient(): string {
        return this.userJid.full;
    }
    get rawRecipient(): string {
        return this.userJid.bare;
    }
    get name(): string {
        return this.user.name;
    }
    get availabilityStatus(): number {
        return this.user.availabilityStatus ?? 0;
    }
    get chatType(): StanzaConstants.MessageType {
        return "chat";
    }

    public connect() {
        if (get(userStore).isLogged) {
            this.sendPresence(true);
        }
    }
    public sendPresence(first: boolean = false) {
        if (first) {
            void this.xmppClient.socket.subscribe(this.userJid.bare);
        }
        this.xmppClient.socket.sendPresence({ to: this.recipient });
        this.console(`>> ${first ? "First " : ""}Presence sent to ${this.userJid.bare}`);
        this.readyStore.set(true);
    }
    public sendChatState(state: ChatState) {
        if (this.closed) {
            return;
        }
        this.xmppClient.socket.sendMessage({ to: this.recipient, chatState: state });
        this.console(">> Chat state sent");
    }
    public sendRetrieveLastMessages() {
        throw new TypeError("Not yet implemented");
    }

    onChatState(chatState: ChatStateMessage): boolean {
        this.console("<< Chat state received");
        this.user.chatState = chatState.chatState;
        this.presenceStore.update((presenceStore: UserList) => {
            presenceStore.set(this.user.jid, { ...this.user, chatState: this.user.chatState });
            return presenceStore;
        });
        return true;
    }
    onPresence(presence: StanzaProtocol.ReceivedPresence): boolean {
        this.console("<< Presence received");
        if (!this.subscriptionAccepted) {
            this.console("<< Subscription accepted");
            this.xmppClient.socket.acceptSubscription(this.rawRecipient);
            this.subscriptionAccepted = true;
        }
        return true;
    }

    public getMe() {
        const defaultRoom = mucRoomsStore.getDefaultRoom();
        if (!defaultRoom) {
            throw new Error("No default muc Room");
        }
        return derived(defaultRoom.getPresenceStore(), ($presenceStore) => $presenceStore.get(this.myJID));
    }
}
