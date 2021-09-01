import Axios from "axios";
import { PUSHER_URL, START_ROOM_URL } from "../Enum/EnvironmentVariable";
import { RoomConnection } from "./RoomConnection";
import type { OnConnectInterface, PositionInterface, ViewportInterface } from "./ConnexionModels";
import { GameConnexionTypes, urlManager } from "../Url/UrlManager";
import { localUserStore } from "./LocalUserStore";
import { CharacterTexture, LocalUser } from "./LocalUser";
import { Room } from "./Room";
import { _ServiceWorker } from "../Network/ServiceWorker";

class ConnectionManager {
    private localUser!: LocalUser;

    private connexionType?: GameConnexionTypes;
    private reconnectingTimeout: NodeJS.Timeout | null = null;
    private _unloading: boolean = false;
    private authToken: string | null = null;

    private serviceWorker?: _ServiceWorker;

    get unloading() {
        return this._unloading;
    }

    constructor() {
        window.addEventListener("beforeunload", () => {
            this._unloading = true;
            if (this.reconnectingTimeout) clearTimeout(this.reconnectingTimeout);
        });
    }

    /**
     * @return Promise<void>
     */
    public loadOpenIDScreen(): Promise<void> {
        const state = localUserStore.generateState();
        const nonce = localUserStore.generateNonce();
        localUserStore.setAuthToken(null);

        //TODO refactor this and don't realise previous call
        return Axios.get(`http://${PUSHER_URL}/login-screen?state=${state}&nonce=${nonce}`)
            .then(() => {
                window.location.assign(`http://${PUSHER_URL}/login-screen?state=${state}&nonce=${nonce}`);
            })
            .catch((err) => {
                console.error(err, "We don't have URL to regenerate authentication user");
                //TODO show modal login
                window.location.reload();
            });
    }

    public logout() {
        localUserStore.setAuthToken(null);
        window.location.reload();
    }

    /**
     * Tries to login to the node server and return the starting map url to be loaded
     */
    public async initGameConnexion(): Promise<Room> {
        const connexionType = urlManager.getGameConnexionType();
        this.connexionType = connexionType;
        let room: Room | null = null;
        if (connexionType === GameConnexionTypes.jwt) {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get("code");
            const state = urlParams.get("state");
            if (!state || !localUserStore.verifyState(state)) {
                throw "Could not validate state!";
            }
            if (!code) {
                throw "No Auth code provided";
            }
            const nonce = localUserStore.getNonce();
            const { authToken } = await Axios.get(`${PUSHER_URL}/login-callback`, { params: { code, nonce } }).then(
                (res) => res.data
            );
            localUserStore.setAuthToken(authToken);
            this.authToken = authToken;
            room = await Room.createRoom(new URL(localUserStore.getLastRoomUrl()));
            urlManager.pushRoomIdToUrl(room);
        } else if (connexionType === GameConnexionTypes.register) {
            //@deprecated
            const organizationMemberToken = urlManager.getOrganizationToken();
            const data = await Axios.post(`${PUSHER_URL}/register`, { organizationMemberToken }).then(
                (res) => res.data
            );
            this.localUser = new LocalUser(data.userUuid, data.textures);
            this.authToken = data.authToken;
            localUserStore.saveUser(this.localUser);
            localUserStore.setAuthToken(this.authToken);

            const roomUrl = data.roomUrl;

            room = await Room.createRoom(
                new URL(
                    window.location.protocol +
                        "//" +
                        window.location.host +
                        roomUrl +
                        window.location.search +
                        window.location.hash
                )
            );
            urlManager.pushRoomIdToUrl(room);
        } else if (
            connexionType === GameConnexionTypes.organization ||
            connexionType === GameConnexionTypes.anonymous ||
            connexionType === GameConnexionTypes.empty
        ) {
            this.authToken = localUserStore.getAuthToken();
            //todo: add here some kind of warning if authToken has expired.
            if (!this.authToken) {
                await this.anonymousLogin();
            }
            this.localUser = localUserStore.getLocalUser() as LocalUser; //if authToken exist in localStorage then localUser cannot be null

            let roomPath: string;
            if (connexionType === GameConnexionTypes.empty) {
                roomPath = window.location.protocol + "//" + window.location.host + START_ROOM_URL;
                //get last room path from cache api
                try {
                    const lastRoomUrl = await localUserStore.getLastRoomUrlCacheApi();
                    if (lastRoomUrl != undefined) {
                        roomPath = lastRoomUrl;
                    }
                } catch (err) {
                    console.error(err);
                }
            } else {
                roomPath =
                    window.location.protocol +
                    "//" +
                    window.location.host +
                    window.location.pathname +
                    window.location.search +
                    window.location.hash;
            }

            //get detail map for anonymous login and set texture in local storage
            room = await Room.createRoom(new URL(roomPath));
            if (room.textures != undefined && room.textures.length > 0) {
                //check if texture was changed
                if (this.localUser.textures.length === 0) {
                    this.localUser.textures = room.textures;
                } else {
                    room.textures.forEach((newTexture) => {
                        const alreadyExistTexture = this.localUser.textures.find((c) => newTexture.id === c.id);
                        if (this.localUser.textures.findIndex((c) => newTexture.id === c.id) !== -1) {
                            return;
                        }
                        this.localUser.textures.push(newTexture);
                    });
                }
                localUserStore.saveUser(this.localUser);
            }
        }
        if (room == undefined) {
            return Promise.reject(new Error("Invalid URL"));
        }

        this.serviceWorker = new _ServiceWorker();
        return Promise.resolve(room);
    }

    public async anonymousLogin(isBenchmark: boolean = false): Promise<void> {
        const data = await Axios.post(`${PUSHER_URL}/anonymLogin`).then((res) => res.data);
        this.localUser = new LocalUser(data.userUuid, []);
        this.authToken = data.authToken;
        if (!isBenchmark) {
            // In benchmark, we don't have a local storage.
            localUserStore.saveUser(this.localUser);
            localUserStore.setAuthToken(this.authToken);
        }
    }

    public initBenchmark(): void {
        this.localUser = new LocalUser("", []);
    }

    public connectToRoomSocket(
        roomUrl: string,
        name: string,
        characterLayers: string[],
        position: PositionInterface,
        viewport: ViewportInterface,
        companion: string | null
    ): Promise<OnConnectInterface> {
        return new Promise<OnConnectInterface>((resolve, reject) => {
            const connection = new RoomConnection(
                this.authToken,
                roomUrl,
                name,
                characterLayers,
                position,
                viewport,
                companion
            );

            connection.onConnectError((error: object) => {
                console.log("An error occurred while connecting to socket server. Retrying");
                reject(error);
            });

            connection.onConnectingError((event: CloseEvent) => {
                console.log("An error occurred while connecting to socket server. Retrying");
                reject(
                    new Error(
                        "An error occurred while connecting to socket server. Retrying. Code: " +
                            event.code +
                            ", Reason: " +
                            event.reason
                    )
                );
            });

            connection.onConnect((connect: OnConnectInterface) => {
                //save last room url connected
                localUserStore.setLastRoomUrl(roomUrl);

                resolve(connect);
            });
        }).catch((err) => {
            // Let's retry in 4-6 seconds
            return new Promise<OnConnectInterface>((resolve, reject) => {
                this.reconnectingTimeout = setTimeout(() => {
                    //todo: allow a way to break recursion?
                    //todo: find a way to avoid recursive function. Otherwise, the call stack will grow indefinitely.
                    this.connectToRoomSocket(roomUrl, name, characterLayers, position, viewport, companion).then(
                        (connection) => resolve(connection)
                    );
                }, 4000 + Math.floor(Math.random() * 2000));
            });
        });
    }

    get getConnexionType() {
        return this.connexionType;
    }
}

export const connectionManager = new ConnectionManager();
