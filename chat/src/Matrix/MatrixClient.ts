import sdk, {IndexedDBStore, MatrixClient as Matrix, MatrixError, MatrixEvent, Room} from "matrix-js-sdk";
import Olm from "olm";
import axios from "axios";
import { SyncState } from "matrix-js-sdk/src/sync";
import { SearchableArrayStore } from "@workadventure/store-utils";
import {get, writable, Writable} from "svelte/store";
import { logger } from "matrix-js-sdk/src/logger";

export class MatrixClient {
    public matrix: Matrix | undefined;
    private _userId: string | undefined;
    private accessToken: string | undefined;
    private _deviceId: string | undefined;
    private readonly indexedDBStore: IndexedDBStore;

    public rooms: SearchableArrayStore<string, Writable<Room>> = new SearchableArrayStore<string, Writable<Room>>((roomStore) => get(roomStore).roomId);

    constructor(private authToken: string, private _homeServerUrl: string){
        window.Olm = Olm;
        logger.setLevel(logger.levels.ERROR);
        this.indexedDBStore = new sdk.IndexedDBStore({
            indexedDB: global.indexedDB,
            localStorage: global.localStorage,
            dbName: 'workadventure-chat',
        });
    }

    async login(){
        const response = await axios.post(`${this._homeServerUrl}/_matrix/client/r0/login`, {
                type: 'org.matrix.login.jwt',
                token: this.authToken,
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        const data = await response.data;
        if (data.errcode) {
            throw new MatrixError(data.errcode, data.error);
        }
        console.log("MatrixClient => login => access_token", data.access_token);
        this._userId = data.user_id;
        this.accessToken = data.access_token;
        this._deviceId = data.device_id;
    }

    async start(){
        try {
            await this.indexedDBStore.startup();

            const client = sdk.createClient({
                baseUrl: `${this._homeServerUrl}`,
                accessToken: this.accessToken,
                userId: this._userId,
                deviceId: this._deviceId,
                verificationMethods: ["m.sas.v1"],
                idBaseUrl: "WorkAdventure",
                store: this.indexedDBStore,
                cryptoStore: new sdk.IndexedDBCryptoStore(global.indexedDB, 'crypto-store'),
            });


            client.on(sdk.RoomEvent.Timeline, (message: MatrixEvent, room) => {
                console.log("MatrixClient => start => RoomEvent.Timeline", message.event.type, message);
                if(room && message.event.type === "m.room.name") {
                    console.warn("Matrix => Room => RoomEvent.Timeline => m.room.message", message, room, this.rooms.has(room.roomId));
                    if(this.rooms.has(room.roomId)) {
                        const room_ = this.rooms.get(room.roomId);
                        if(room_) {
                            room_.set(room);
                        }
                    }
                }
            });

            client.on(sdk.ClientEvent.Sync, (state, prevState) => {
                switch (state) {
                    case SyncState.Syncing: {
                        console.log('SYNCING state');
                        break;
                    }
                    case SyncState.Error: {
                        console.error('ERROR state');
                        break;
                    }
                    case SyncState.Catchup: {
                        console.log('CATCHUP state');
                        break;
                    }
                    case SyncState.Prepared: {
                        console.log('PREPARED state');
                        console.log('Previous state: ', prevState);
                        break;
                    }
                    case SyncState.Stopped: {
                        console.log('STOPPED state');
                        break;
                    }
                    case SyncState.Reconnecting: {
                        console.log('RECONNECTING state');
                        break;
                    }
                    default: {
                        console.log('DEFAULT state', state);
                        break;
                    }
                }
            });

            client.on(sdk.ClientEvent.Room, (room) => {
                console.log("Matrix => Room => ClientEvent.Room", room);
                if(!this.rooms.has(room.roomId)) {
                    this.rooms.push(writable(room));
                } else {
                    const room_ = this.rooms.get(room.roomId);
                    if(room_) {
                        room_.set(room);
                        this.rooms.update(room_);
                    }
                }
            });

            client.on(sdk.RoomStateEvent.Events, (event, state, lastStateEvent) => {
                console.log("Matrix => Room => RoomStateEvent.Events", event, state, lastStateEvent);
            });

            client.on(sdk.RoomEvent.Timeline, (event, state, lastStateEvent) => {
                console.log("Matrix => Room => RoomEvent.Timeline", event, state, lastStateEvent);
            });

            client.on(sdk.RoomStateEvent.Update, (state) => {
                console.log("Matrix => Room => RoomStateEvent.Update", state);
            });

            client.on(sdk.RoomMemberEvent.Membership, (state) => {
                console.log("Matrix => Room => RoomMemberEvent.Membership", state);
            });

            await client.initCrypto();
            await client.startClient();
            client.setGlobalErrorOnUnknownDevices(false);
            this.matrix = client;
        } catch (error) {
            if(error instanceof MatrixError) {
                console.error("Matrix => start => ", error.errcode, error.data.error);
            } else {
                console.trace("Matrix => receive => error", error);
            }
        }
    }

    public async createRoom(name: string) {
        const room_raw = await this.matrix?.createRoom({
            visibility: sdk.Visibility.Private,
            name: name,
            initial_state: [{
                type: 'm.room.encryption',
                state_key: '',
                content: {
                    algorithm: 'm.megolm.v1.aes-sha2',
                },
            }],
        });

        console.log(room_raw);
    }
}
