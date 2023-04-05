import { XmppSettingsMessage } from "@workadventure/messages";
import { get } from "svelte/store";
import Debug from "debug";
import { XmppClient } from "../Xmpp/XmppClient";
import { connectionEstablishedStore, enableChat } from "../Stores/ChatStore";
import { xmppServerConnectionStatusStore } from "../Stores/MucRoomsStore";

const debug = Debug("chat");

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
        debug("chatConnectionManager => initUser");
        this.uuid = uuid;
        this.authToken = authToken;
        this.playUri = playUri;

        this.start();
    }

    initXmppSettings(xmppSettingsMessages: XmppSettingsMessage) {
        debug("chatConnectionManager => initXmppSettings");
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
        debug("chatConnectionManager => start");
        if (this.uuid !== "" && this.authToken && this.playUri !== "" && this.xmppSettingsMessage && !this.xmppClient) {
            debug("chatConnectionManager => start => all parameters are OK");
            if (get(enableChat)) {
                this.xmppClient = new XmppClient(this.xmppSettingsMessage);
            } else {
                xmppServerConnectionStatusStore.set(true);
            }
            connectionEstablishedStore.set(true);
        } else {
            debug(
                `chatConnectionManager => start => all parameters are NOT OK ${JSON.stringify({
                    uuid: this.uuid,
                    authToken: this.authToken,
                    playUrl: this.playUri,
                    xmppSettingsMessage: this.xmppSettingsMessage,
                    xmppClient: !this.xmppClient,
                })}`
            );
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
