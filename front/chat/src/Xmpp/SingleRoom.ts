import {AbstractRoom} from "./AbstractRoom";
import {XmppClient} from "./XmppClient";

const _VERBOSE = true;

export class SingleRoom extends AbstractRoom {

    constructor(xmppClient: XmppClient, public jid: string) {
        super(xmppClient, jid, "chat", _VERBOSE);
    }

    public updateComposingState(state: string) {
        // TODO implement
    }
}
