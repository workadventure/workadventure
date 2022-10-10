import type { ChatConnection } from "../Connection/ChatConnection";
import {AbstractRoom} from "./AbstractRoom";
import {XmppClient} from "./XmppClient";

export class SingleRoom extends AbstractRoom {
    constructor(protected connection: ChatConnection, xmppClient: XmppClient, public userJid: string) {
        super(connection, xmppClient);
    }

    get user(){
        return this.xmppClient.getUser(this.userJid);
    }
}
