import Axios from "axios";
import { PUSHER_URL } from "../Enum/EnvironmentVariable";
import { RoomConnection } from "./RoomConnection";
import type { OnConnectInterface, PositionInterface, ViewportInterface } from "./ConnexionModels";
import { GameConnexionTypes, urlManager } from "../Url/UrlManager";
import { localUserStore } from "./LocalUserStore";
import { CharacterTexture, LocalUser } from "./LocalUser";
import { Room } from "./Room";
import { _ServiceWorker } from "../Network/ServiceWorker";
import { loginSceneVisibleIframeStore } from "../Stores/LoginSceneStore";
import { userIsConnected, warningContainerStore } from "../Stores/MenuStore";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { axiosWithRetry } from "./AxiosUtils";
import axios from "axios";
import { isRegisterData } from "../Messages/JsonMessages/RegisterData";
import { isAdminApiData } from "../Messages/JsonMessages/AdminApiData";
import { limitMapStore } from "../Stores/GameStore";
import { showLimitRoomModalStore } from "../Stores/ModalStore";

class ConnectionManager {
    private localUser!: LocalUser;

    private connexionType?: GameConnexionTypes;
    private reconnectingTimeout: NodeJS.Timeout | null = null;
    private _unloading: boolean = false;
    private authToken: string | null = null;
    private _currentRoom: Room | null = null;

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
     * TODO fix me to be move in game manager
     */
    public loadOpenIDScreen() {
        const state = localUserStore.generateState();
        const nonce = localUserStore.generateNonce();
        localUserStore.setAuthToken(null);

        if (!this._currentRoom || !this._currentRoom.iframeAuthentication) {
            loginSceneVisibleIframeStore.set(false);
            return null;
        }
        const redirectUrl = new URL(`${this._currentRoom.iframeAuthentication}`);
        redirectUrl.searchParams.append("state", state);
        redirectUrl.searchParams.append("nonce", nonce);
        redirectUrl.searchParams.append("playUri", this._currentRoom.key);
        window.location.assign(redirectUrl.toString());
        return redirectUrl;
    }

    /**
     * Logout
     */
    public async logout() {
        //user logout, set connected store for menu at false
        userIsConnected.set(false);

        //Logout user in pusher and hydra
        const token = localUserStore.getAuthToken();
        const { authToken } = await Axios.get(`${PUSHER_URL}/logout-callback`, { params: { token } }).then(
            (res) => res.data
        );
        localUserStore.setAuthToken(null);

        //Go on login page can permit to clear token and start authentication process
        window.location.assign("/login");
    }

    /**
     * Tries to login to the node server and return the starting map url to be loaded
     */
    public async initGameConnexion(): Promise<Room> {
        const connexionType = urlManager.getGameConnexionType();
        this.connexionType = connexionType;
        this._currentRoom = null;

        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");
        if (token) {
            this.authToken = token;
            localUserStore.setAuthToken(token);

            //clean token of url
            urlParams.delete("token");
        }

        if (connexionType === GameConnexionTypes.login) {
            this._currentRoom = await Room.createRoom(new URL(localUserStore.getLastRoomUrl()));
            if (this.loadOpenIDScreen() !== null) {
                return Promise.reject(new Error("You will be redirect on login page"));
            }
            urlManager.pushRoomIdToUrl(this._currentRoom);
        } else if (connexionType === GameConnexionTypes.jwt) {
            if (!token) {
                const code = urlParams.get("code");
                const state = urlParams.get("state");
                if (!state || !localUserStore.verifyState(state)) {
                    throw new Error("Could not validate state!");
                }
                if (!code) {
                    throw new Error("No Auth code provided");
                }
                localUserStore.setCode(code);
            }

            this._currentRoom = await Room.createRoom(new URL(localUserStore.getLastRoomUrl()));
            try {
                await this.checkAuthUserConnexion();
                analyticsClient.loggedWithSso();
            } catch (err) {
                console.error(err);
                this.loadOpenIDScreen();
                return Promise.reject(new Error("You will be redirect on login page"));
            }
            urlManager.pushRoomIdToUrl(this._currentRoom);
        } else if (connexionType === GameConnexionTypes.register) {
            //@deprecated
            const organizationMemberToken = urlManager.getOrganizationToken();
            const data = await Axios.post(`${PUSHER_URL}/register`, { organizationMemberToken }).then(
                (res) => res.data
            );
            if (!isRegisterData(data)) {
                console.error("Invalid data received from /register route. Data: ", data);
                throw new Error("Invalid data received from /register route.");
            }
            this.localUser = new LocalUser(data.userUuid, data.textures, data.email);
            this.authToken = data.authToken;
            localUserStore.saveUser(this.localUser);
            localUserStore.setAuthToken(this.authToken);
            analyticsClient.loggedWithToken();

            const roomUrl = data.roomUrl;

            const query = urlParams.toString();
            this._currentRoom = await Room.createRoom(
                new URL(
                    window.location.protocol +
                        "//" +
                        window.location.host +
                        roomUrl +
                        (query ? "?" + query : "") + //use urlParams because the token param must be deleted
                        window.location.hash
                )
            );
            urlManager.pushRoomIdToUrl(this._currentRoom);
        } else if (connexionType === GameConnexionTypes.room || connexionType === GameConnexionTypes.empty) {
            this.authToken = localUserStore.getAuthToken();

            let roomPath: string;
            if (connexionType === GameConnexionTypes.empty) {
                roomPath = localUserStore.getLastRoomUrl();
                //get last room path from cache api
                try {
                    const lastRoomUrl = await localUserStore.getLastRoomUrlCacheApi();
                    if (lastRoomUrl != undefined) {
                        roomPath = lastRoomUrl;
                    }
                } catch (err) {
                    console.error(err);
                    if (err instanceof Error) {
                        console.error(err.stack);
                    }
                }
            } else {
                const query = urlParams.toString();
                roomPath =
                    window.location.protocol +
                    "//" +
                    window.location.host +
                    window.location.pathname +
                    (query ? "?" + query : "") + //use urlParams because the token param must be deleted
                    window.location.hash;
            }

            //Set last room visited! (connected or nor, must to be saved in localstorage and cache API)
            //use href to keep # value
            await localUserStore.setLastRoomUrl(new URL(roomPath).href);

            //get detail map for anonymous login and set texture in local storage
            //before set token of user we must load room and all information. For example the mandatory authentication could be require on current room
            this._currentRoom = await Room.createRoom(new URL(roomPath));

            //todo: add here some kind of warning if authToken has expired.
            if (!this.authToken && !this._currentRoom.authenticationMandatory) {
                await this.anonymousLogin();
            } else {
                try {
                    await this.checkAuthUserConnexion();
                    analyticsClient.loggedWithSso();
                } catch (err) {
                    console.error(err);
                    // if the user must be connected in the current room or if the pusher error is not openid provider access error
                    // try to connect with function loadOpenIDScreen
                    if (
                        this._currentRoom.authenticationMandatory ||
                        (axios.isAxiosError(err) &&
                            err.response?.data &&
                            err.response.data !== "User cannot to be connected on openid provider")
                    ) {
                        this.loadOpenIDScreen();
                        return Promise.reject(new Error("You will be redirect on login page"));
                    }
                }
            }
            this.localUser = localUserStore.getLocalUser() as LocalUser; //if authToken exist in localStorage then localUser cannot be null

            if (this._currentRoom.textures != undefined && this._currentRoom.textures.length > 0) {
                //check if texture was changed
                if (this.localUser.textures.length === 0) {
                    this.localUser.textures = this._currentRoom.textures;
                } else {
                    this._currentRoom.textures.forEach((newTexture) => {
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
        if (this._currentRoom == undefined) {
            return Promise.reject(new Error("Invalid URL"));
        }
        if (this.localUser) {
            analyticsClient.identifyUser(this.localUser.uuid, this.localUser.email);
        }

        //if limit room active test headband
        if (this._currentRoom.expireOn !== undefined) {
            warningContainerStore.activateWarningContainer();
            limitMapStore.set(true);

            //check time of map
            if (new Date() > this._currentRoom.expireOn) {
                showLimitRoomModalStore.set(true);
            }
        }

        this.serviceWorker = new _ServiceWorker();
        return Promise.resolve(this._currentRoom);
    }

    public async anonymousLogin(isBenchmark: boolean = false): Promise<void> {
        const data = await axiosWithRetry.post(`${PUSHER_URL}/anonymLogin`).then((res) => res.data);
        this.localUser = new LocalUser(data.userUuid, [], data.email);
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

            connection.connectionErrorStream.subscribe((event: CloseEvent) => {
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

            connection.roomJoinedMessageStream.subscribe((connect: OnConnectInterface) => {
                resolve(connect);
            });
        }).catch((err) => {
            // Let's retry in 4-6 seconds
            return new Promise<OnConnectInterface>((resolve, reject) => {
                this.reconnectingTimeout = setTimeout(() => {
                    //todo: allow a way to break recursion?
                    //todo: find a way to avoid recursive function. Otherwise, the call stack will grow indefinitely.
                    void this.connectToRoomSocket(roomUrl, name, characterLayers, position, viewport, companion).then(
                        (connection) => resolve(connection)
                    );
                }, 4000 + Math.floor(Math.random() * 2000));
            });
        });
    }

    get getConnexionType() {
        return this.connexionType;
    }

    async checkAuthUserConnexion() {
        //set connected store for menu at false
        userIsConnected.set(false);

        const token = localUserStore.getAuthToken();
        const state = localUserStore.getState();
        const code = localUserStore.getCode();
        const nonce = localUserStore.getNonce();

        if (!token) {
            if (!state || !localUserStore.verifyState(state)) {
                throw new Error("Could not validate state!");
            }
            if (!code) {
                throw new Error("No Auth code provided");
            }
        }
        const { authToken, userUuid, textures, email } = await Axios.get(`${PUSHER_URL}/login-callback`, {
            params: { code, nonce, token, playUri: this.currentRoom?.key },
        }).then((res) => {
            return res.data;
        });
        localUserStore.setAuthToken(authToken);
        this.localUser = new LocalUser(userUuid, textures, email);
        localUserStore.saveUser(this.localUser);
        this.authToken = authToken;

        //user connected, set connected store for menu at true
        userIsConnected.set(true);
    }

    get currentRoom() {
        return this._currentRoom;
    }
}

export const connectionManager = new ConnectionManager();
