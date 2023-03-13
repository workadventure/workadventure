import sdk, { IndexedDBStore, MatrixClient as Matrix, MatrixError, MatrixEvent, Room } from "matrix-js-sdk";
import Olm from "olm";
import axios from "axios";
import { SyncState } from "matrix-js-sdk/src/sync";
import { SearchableArrayStore } from "@workadventure/store-utils";
import { get, writable, Writable } from "svelte/store";
import { logger } from "matrix-js-sdk/src/logger";

import debug from "debug";
import { localUserStore } from "../Stores/LocalUserStore";

const debugLog = debug("matrix");

export type RoomWrapper = {
    room: Writable<Room>;
    messages: Writable<MatrixEvent[]>;
};

export class MatrixClient {
    public matrix: Matrix | undefined;
    private _userId: string | undefined;
    private accessToken: string | undefined;
    private _deviceId: string | undefined;
    private readonly indexedDBStore: IndexedDBStore;

    public rooms: SearchableArrayStore<string, RoomWrapper> = new SearchableArrayStore<string, RoomWrapper>(
        (roomStore) => get(roomStore.room).roomId
    );

    constructor(private authToken: string, public readonly homeServerUrl: string) {
        window.Olm = Olm;
        logger.setLevel(logger.levels.ERROR);
        this.indexedDBStore = new sdk.IndexedDBStore({
            indexedDB: global.indexedDB,
            localStorage: global.localStorage,
            dbName: "workadventure-chat",
        });
    }

    async login() {
        const response = await axios.post(
            `${this.homeServerUrl}/_matrix/client/r0/login`,
            {
                type: "org.matrix.login.jwt",
                token: this.authToken,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
        const data = await response.data;
        if (data.errcode) {
            throw new MatrixError(data.errcode, data.error);
        }
        this._userId = data.user_id;
        this.accessToken = data.access_token;
        this._deviceId = data.device_id;
    }

    async start() {
        try {
            await this.indexedDBStore.startup();

            const client = sdk.createClient({
                baseUrl: `${this.homeServerUrl}`,
                accessToken: this.accessToken,
                userId: this._userId,
                deviceId: this._deviceId,
                verificationMethods: ["m.sas.v1"],
                idBaseUrl: "WorkAdventure",
                store: this.indexedDBStore,
                cryptoStore: new sdk.IndexedDBCryptoStore(global.indexedDB, "crypto-store"),
            });

            client.on(sdk.RoomEvent.Timeline, (message: MatrixEvent, room) => {
                console.warn("MatrixClient => start => RoomEvent.Timeline", message.event.type, message, room);
                if (room) {
                    const room_ = this.getRoomOrCreate(room);
                    if (message.event.type === "m.room.name") {
                        room_.room.set(room);
                    }
                    console.log("message added to room");
                    room_.messages.update((messages) => {
                        messages.push(message);
                        return messages;
                    });
                    this.rooms.update(room_);
                }
            });

            client.on(sdk.ClientEvent.Sync, (state, prevState) => {
                switch (state) {
                    case SyncState.Syncing: {
                        debugLog("SYNCING state");
                        break;
                    }
                    case SyncState.Error: {
                        debugLog("ERROR state");
                        break;
                    }
                    case SyncState.Catchup: {
                        debugLog("CATCHUP state");
                        break;
                    }
                    case SyncState.Prepared: {
                        debugLog("PREPARED state");
                        debugLog("Previous state: ", prevState);
                        break;
                    }
                    case SyncState.Stopped: {
                        debugLog("STOPPED state");
                        break;
                    }
                    case SyncState.Reconnecting: {
                        debugLog("RECONNECTING state");
                        break;
                    }
                    default: {
                        debugLog("DEFAULT state", state);
                        break;
                    }
                }
            });

            client.on(sdk.ClientEvent.Room, (room: Room) => {
                debugLog("Matrix => Room => ClientEvent.Room", room);
                const room_ = this.getRoomOrCreate(room);
                if (room_) {
                    room_.room.set(room);
                    this.rooms.update(room_);
                }
            });

            client.on(sdk.RoomStateEvent.Events, (event, state, lastStateEvent) => {
                debugLog("Matrix => Room => RoomStateEvent.Events", event, state, lastStateEvent);
            });

            client.on(sdk.RoomStateEvent.Update, (state) => {
                debugLog("Matrix => Room => RoomStateEvent.Update", state);
            });

            client.on(sdk.RoomMemberEvent.Membership, (state) => {
                debugLog("Matrix => Room => RoomMemberEvent.Membership", state);
            });

            await client.initCrypto();
            await client.startClient();
            client.setGlobalErrorOnUnknownDevices(false);
            await client.setDisplayName(localUserStore.getPlayerName());
            this.matrix = client;
        } catch (error) {
            if (error instanceof MatrixError) {
                console.error("Matrix => start => ", error.errcode, error.data.error);
            } else {
                console.trace("Matrix => receive => error", error);
            }
        }
    }

    public async createRoom(name: string) {
        await this.matrix?.createRoom({
            visibility: sdk.Visibility.Private,
            name: name,
            initial_state: [
                {
                    type: "m.room.encryption",
                    state_key: "",
                    content: {
                        algorithm: "m.megolm.v1.aes-sha2",
                    },
                },
            ],
        });
    }

    private getRoomOrCreate(room: Room): RoomWrapper {
        let room_ = this.rooms.get(room.roomId);
        if (!room_) {
            room_ = { room: writable(room), messages: writable([]) };
            this.rooms.push(room_);
        }
        return room_;
    }
}
