import {AbstractRoom, User} from "./AbstractRoom";
import {XmppClient} from "./XmppClient";
import {ParsedJID} from "stanza/JID";
import {get, Writable, writable, derived} from "svelte/store";
import {v4 as uuid} from "uuid";
import {userStore} from "../Stores/LocalUserStore";
import {mucRoomsStore} from "../Stores/MucRoomsStore";

const _VERBOSE = true;

export class SingleRoom extends AbstractRoom {
    private canLoadOlderMessagesStore: Writable<boolean>;
    private showDisabledLoadOlderMessagesStore: Writable<boolean>;

    constructor(
        xmppClient: XmppClient,
        public readonly user: User,
        protected userJid: ParsedJID,
    ) {
        super(xmppClient, _VERBOSE);

        this.canLoadOlderMessagesStore = writable<boolean>(true);
        this.showDisabledLoadOlderMessagesStore = writable<boolean>(false);
    }

    get recipient(): string {
        return this.userJid.full;
    }

    get name(): string {
        return this.user.name;
    }

    public connect() {
        this.sendPresence(true);
    }

    public sendPresence(first: boolean = false) {
        if (this.closed) {
            return;
        }
        const presenceId = uuid();
        if (first) {
            this.subscriptions.set("firstPresence", presenceId);
            void this.xmppClient.socket.subscribe(this.userJid.bare);
        }

        this.sendUserInfo(presenceId);

        //this.xmppClient.socket.sendPresence({ to: this.recipient, id: presenceId, muc: {type: 'info', affiliation: "none", role: "participant"} });
        if (_VERBOSE)
            console.warn(
                `[XMPP][${this.user.name}]`,
                ">> ",
                first && "First",
                "Presence sent",
                get(userStore).uuid,
                presenceId
            );
    }

    public getMe() {
        const defaultRoom = mucRoomsStore.getDefaultRoom();
        if(!defaultRoom){
            throw new Error('No default muc Room');
        }
        return derived(defaultRoom.getPresenceStore(), ($presenceStore) => $presenceStore.get(this.myJID));
    }
}