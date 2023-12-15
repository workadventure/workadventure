import { KlaxoonService } from "@workadventure/shared-utils";
import { Deferred } from "ts-deferred/index";
import { get, writable, Writable } from "svelte/store";
import Debug from "debug";
import { MatrixClient as Matrix } from "matrix-js-sdk";
import { XmppClient } from "../Xmpp/XmppClient";
import { xmppServerConnectionStatusStore } from "../Stores/MucRoomsStore";
import { MatrixClient } from "../Matrix/MatrixClient";
import { connectionEstablishedStore, enableChat } from "../Stores/ChatStore";

const debug = Debug("chat");

class ChatConnectionManager {
    private _authToken?: string;
    private matrixClient?: MatrixClient;
    //private deferredXmppClient: Deferred<XmppClient>;
    public isConnected: Writable<boolean> = writable(false);

    private _klaxoonToolActivated = false;
    private _klaxoonToolClientId: string | undefined = undefined;
    private _youtubeToolActivated = false;
    private _googleDocsToolActivated = false;
    private _googleSheetsToolActivated = false;
    private _googleSlidesToolActivated = false;
    private _eraserToolActivated = false;

    /*constructor() {
        this.deferredXmppClient = new Deferred<XmppClient>();
    }*/

    // TODO: CHECK THIS IS CALLED AFTER MERGE TO MATRIX
    initUser(
        klaxoonToolActivated: boolean,
        youtubeToolActivated: boolean,
        googleDocsToolActivated: boolean,
        googleSheetsToolActivated: boolean,
        googleSlidesToolActivated: boolean,
        eraserToolActivated: boolean,
        klaxoonToolClientId?: string
    ) {
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
    }

    set authToken(value: string) {
        this._authToken = value;
    }

    get connectionOrFail(): MatrixClient {
        if (!this.matrixClient) {
            throw new Error("No chat connection with Matrix server!");
        }
        return this.matrixClient;
    }

    get matrixOrFail(): Matrix {
        if (!this.matrixClient || !this.matrixClient.matrix) {
            throw new Error("No chat connection with Matrix server!");
        }
        return this.matrixClient.matrix;
    }

    /*get connectionPromise(): Promise<XmppClient> {
        return this.deferredXmppClient.promise;
    }*/

    get connection(): MatrixClient | undefined {
        return this.matrixClient;
    }

    public start() {
        debug("chatConnectionManager => start");
        if (this._authToken && !this.matrixClient) {
            debug("chatConnectionManager => start => all parameters are OK");
            if (get(enableChat)) {
                this.matrixClient = new MatrixClient(this._authToken, "http://matrix.workadventure.localhost");
                this.matrixClient
                    .login()
                    .then(async () => {
                        await this.matrixClient?.start();
                        this.isConnected.set(true);
                        //this.deferredXmppClient.resolve(this.xmppClient);
                    })
                    .catch((e) => {
                        //this.deferredXmppClient.reject(e);
                        console.error("ChatConnectionManager => start", e);
                    });
            } else {
                //this.deferredXmppClient.reject("Chat is disabled");
                xmppServerConnectionStatusStore.set(true);
            }
            connectionEstablishedStore.set(true);
        }
    }

    get isClosed(): boolean {
        return this.matrixClient == undefined;
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
