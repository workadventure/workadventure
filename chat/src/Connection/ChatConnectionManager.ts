import { XmppSettingsMessage } from "../Messages/ts-proto-generated/protos/messages";
import { XmppClient } from "../Xmpp/XmppClient";

class ChatConnectionManager {
    private uuid: string;
    private playUri: string;
    private authToken?: string;
    private xmppSettingsMessage?: XmppSettingsMessage;
    private xmppClient?: XmppClient;

    constructor() {
        this.uuid = "";
        this.playUri = "";
    }

    initUser(playUri: string, uuid: string, authToken?: string) {
        this.uuid = uuid;
        this.authToken = authToken;
        this.playUri = playUri;

        this.start();
    }

    initXmppSettings(xmppSettingsMessages: XmppSettingsMessage) {
        this.xmppSettingsMessage = xmppSettingsMessages;

        this.start();
    }

    get connectionOrFail(): XmppClient {
        if (!this.xmppClient) {
            throw new Error("No chat connection with XMPP server!");
        }
        return this.xmppClient;
    }

    get connection(): XmppClient | undefined {
        return this.xmppClient;
    }

    public start() {
        if (this.uuid !== "" && this.authToken && this.playUri !== "" && this.xmppSettingsMessage && !this.xmppClient) {
            this.xmppClient = new XmppClient(this.xmppSettingsMessage);
        }

        /*this.chatConnection.xmppConnectionNotAuthorizedStream.subscribe(() => {
            if (this.setTimeout) {
                clearTimeout(this.setTimeout);
            }

            //close connection before start
            this.chatConnection?.close();
            this.chatConnection = undefined;
            return (this.setTimeout = setTimeout(() => {
                if (this.chatConnection == undefined || this.chatConnection.isClose) {
                    this.start();
                }
            }, 10000));
        });

        this.chatConnection.connectionErrorStream.subscribe(() => {
            if (this.setTimeout) {
                clearTimeout(this.setTimeout);
            }

            //close connection before start
            this.chatConnection?.close();
            this.chatConnection = undefined;
            return (this.setTimeout = setTimeout(() => {
                if (this.chatConnection == undefined || this.chatConnection.isClose) {
                    this.start();
                }
            }, 10000));
        });*/
    }

    get isClosed(): boolean {
        return this.xmppClient == undefined || this.xmppClient.isClosed;
    }
}
export const chatConnectionManager = new ChatConnectionManager();
