import { connectionEstablishedStore, enableChat } from "../Stores/ChatStore";
import {get, writable, Writable} from "svelte/store";
import { xmppServerConnectionStatusStore } from "../Stores/MucRoomsStore";
import Debug from "debug";
import {MatrixClient} from "../Matrix/MatrixClient";
import { MatrixClient as Matrix} from "matrix-js-sdk";

const debug = Debug("chat");

class ChatConnectionManager {
    private _authToken?: string;
    private matrixClient?: MatrixClient;

    public isConnected: Writable<boolean> = writable(false);

    constructor() {
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

    get connection(): MatrixClient | undefined {
        return this.matrixClient;
    }

    public start() {
        debug("chatConnectionManager => start");
        if (this._authToken && !this.matrixClient) {
            debug("chatConnectionManager => start => all parameters are OK");
            if (get(enableChat)) {
                this.matrixClient = new MatrixClient(this._authToken, "http://matrix.workadventure.localhost");
                this.matrixClient.login().then(async () => {
                    await this.matrixClient?.start();
                    this.isConnected.set(true);
                }).catch((e) => {
                    console.error("ChatConnectionManager => start", e);
                })
            } else {
                xmppServerConnectionStatusStore.set(true);
            }
            connectionEstablishedStore.set(true);
        }
    }

    get isClosed(): boolean {
        return this.matrixClient == undefined;
    }
}
export const chatConnectionManager = new ChatConnectionManager();
