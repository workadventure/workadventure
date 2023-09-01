import { XmppSettingsMessage } from "@workadventure/messages";
import { KlaxoonService } from "@workadventure/shared-utils";
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

    private _klaxoonToolActivated = false;
    private _klaxoonToolClientId: string | undefined = undefined;
    private _youtubeToolActivated = false;
    private _googleDocsToolActivated = false;
    private _googleSheetsToolActivated = false;
    private _googleSlidesToolActivated = false;
    private _eraserToolActivated = false;

    constructor() {
        this.uuid = "";
        this.playUri = "";
    }

    initUser(
        playUri: string,
        uuid: string,
        klaxoonToolActivated: boolean,
        youtubeToolActivated: boolean,
        googleDocsToolActivated: boolean,
        googleSheetsToolActivated: boolean,
        googleSlidesToolActivated: boolean,
        eraserToolActivated: boolean,
        authToken?: string,
        klaxoonToolClientId?: string
    ) {
        debug("chatConnectionManager => initUser");
        this.uuid = uuid;
        this.authToken = authToken;
        this.playUri = playUri;

        this._klaxoonToolActivated = klaxoonToolActivated;
        this._klaxoonToolClientId = klaxoonToolClientId;
        if (klaxoonToolClientId) {
            KlaxoonService.initWindowKlaxoonActivityPicker();
        }
        this._youtubeToolActivated = youtubeToolActivated;
        this._googleDocsToolActivated = googleDocsToolActivated;
        this._googleSheetsToolActivated = googleSheetsToolActivated;
        this._googleSlidesToolActivated = googleSlidesToolActivated;
        this._eraserToolActivated = eraserToolActivated;

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

    get klaxoonToolIsActivated(): boolean {
        return this._klaxoonToolActivated;
    }
    get klaxoonToolClientId(): string | undefined {
        return this._klaxoonToolClientId;
    }
    get youtubeToolIsActivated(): boolean {
        return this._youtubeToolActivated;
    }
    get googleDocsToolIsActivated(): boolean {
        return this._googleDocsToolActivated;
    }
    get googleSheetsToolIsActivated(): boolean {
        return this._googleSheetsToolActivated;
    }
    get googleSlidesToolIsActivated(): boolean {
        return this._googleSlidesToolActivated;
    }
    get eraserToolIsActivated(): boolean {
        return this._eraserToolActivated;
    }
}
export const chatConnectionManager = new ChatConnectionManager();
