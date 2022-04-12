import Axios from "axios";
import { PUSHER_URL } from "../Enum/EnvironmentVariable";
import { RoomConnection } from "./RoomConnection";
import type { OnConnectInterface, PositionInterface, ViewportInterface } from "./ConnexionModels";
import { GameConnexionTypes, urlManager } from "../Url/UrlManager";
import { localUserStore } from "./LocalUserStore";
import { LocalUser } from "./LocalUser";
import { Room } from "./Room";
import { _ServiceWorker } from "../Network/ServiceWorker";
import { loginSceneVisibleIframeStore } from "../Stores/LoginSceneStore";
import { userIsConnected, warningContainerStore } from "../Stores/MenuStore";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { axiosWithRetry } from "./AxiosUtils";
import axios from "axios";
import { isRegisterData } from "../Messages/JsonMessages/RegisterData";
import { limitMapStore } from "../Stores/GameStore";
import { showLimitRoomModalStore } from "../Stores/ModalStore";
import { gameManager } from "../Phaser/Game/GameManager";
import { locales } from "../i18n/i18n-util";
import type { Locales } from "../i18n/i18n-types";
import { setCurrentLocale } from "../i18n/locales";

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
     *
     * Returns the URL that we need to redirect to to load the OpenID screen, or "null" if no redirection needs to happen.
     */
    public loadOpenIDScreen(): URL | null {
        const state = localUserStore.generateState();
        const nonce = localUserStore.generateNonce();
        localUserStore.setAuthToken(null);

        if (!this._currentRoom || !this._currentRoom.iframeAuthentication) {
            loginSceneVisibleIframeStore.set(false);
            return null;
        }
        const redirectUrl = new URL(`${this._currentRoom.iframeAuthentication}`, window.location.href);
        redirectUrl.searchParams.append("state", state);
        redirectUrl.searchParams.append("nonce", nonce);
        redirectUrl.searchParams.append("playUri", this._currentRoom.key);
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
        await Axios.get(`${PUSHER_URL}/logout-callback`, { params: { token } }).then((res) => res.data);
        localUserStore.setAuthToken(null);

        //Go on login page can permit to clear token and start authentication process
        window.location.assign("/login");
    }

    /**
     * Tries to login to the node server and return the starting map url to be loaded
     *
     * @return returns a promise to the Room we are going to load OR a pointer to the URL we must redirect to if authentication is needed.
     */
    public async initGameConnexion(): Promise<Room | URL> {
        this.connexionType = urlManager.getGameConnexionType();
        this._currentRoom = null;

        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");
        if (token) {
            this.authToken = token;
            localUserStore.setAuthToken(token);

            //clean token of url
            urlParams.delete("token");
        }

        if (this.connexionType === GameConnexionTypes.login) {
            this._currentRoom = await Room.createRoom(new URL(localUserStore.getLastRoomUrl()));
            const redirect = this.loadOpenIDScreen();
            if (redirect !== null) {
                return redirect;
            }
            urlManager.pushRoomIdToUrl(this._currentRoom);
        } else if (this.connexionType === GameConnexionTypes.jwt) {
            /** @deprecated */
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
                const redirect = this.loadOpenIDScreen();
                if (redirect === null) {
                    throw new Error("Unable to redirect on login page.");
                }
                return redirect;
            }
            urlManager.pushRoomIdToUrl(this._currentRoom);
        }
        //@deprecated
        else if (this.connexionType === GameConnexionTypes.register) {
            const organizationMemberToken = urlManager.getOrganizationToken();
            const result = await Axios.post(`${PUSHER_URL}/register`, { organizationMemberToken }).then(
                (res) => res.data
            );

            const registerDataChecking = isRegisterData.safeParse(result);

            if (!registerDataChecking.success) {
                console.error("Invalid data received from /register route. Data: ", result);
                throw new Error("Invalid data received from /register route.");
            }

            const data = registerDataChecking.data;

            this.localUser = new LocalUser(data.userUuid, data.email);
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
        } else if (this.connexionType === GameConnexionTypes.room || this.connexionType === GameConnexionTypes.empty) {
            this.authToken = localUserStore.getAuthToken();

            let roomPath: string;
            if (this.connexionType === GameConnexionTypes.empty) {
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
                        const redirect = this.loadOpenIDScreen();
                        if (redirect === null) {
                            throw new Error("Unable to redirect on login page.");
                        }
                        return redirect;
                    }
                }
            }
            this.localUser = localUserStore.getLocalUser() as LocalUser; //if authToken exist in localStorage then localUser cannot be null
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
        this.localUser = new LocalUser(data.userUuid, data.email);
        this.authToken = data.authToken;
        if (!isBenchmark) {
            // In benchmark, we don't have a local storage.
            localUserStore.saveUser(this.localUser);
            localUserStore.setAuthToken(this.authToken);
        }
    }

    public initBenchmark(): void {
        this.localUser = new LocalUser("");
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
        }).catch(() => {
            // Let's retry in 4-6 seconds
            return new Promise<OnConnectInterface>((resolve) => {
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
        const { authToken, userUuid, email, username, locale, textures } = await Axios.get(
            `${PUSHER_URL}/login-callback`,
            {
                params: { code, nonce, token, playUri: this.currentRoom?.key },
            }
        ).then((res) => {
            return res.data;
        });
        localUserStore.setAuthToken(authToken);
        this.localUser = new LocalUser(userUuid, email);
        localUserStore.saveUser(this.localUser);
        this.authToken = authToken;

        if (username) {
            gameManager.setPlayerName(username);
        }

        if (locale) {
            try {
                if (locales.indexOf(locale) == -1) {
                    locales.forEach((l) => {
                        if (l.startsWith(locale.split("-")[0])) {
                            setCurrentLocale(l);
                            return;
                        }
                    });
                } else {
                    setCurrentLocale(locale as Locales);
                }
            } catch (err) {
                console.warn("Could not set locale", err);
            }
        }

        if (textures) {
            const layers: string[] = [];
            for (const texture of textures) {
                if (texture !== undefined) {
                    layers.push(texture.id);
                }
            }
            if (layers.length > 0) {
                gameManager.setCharacterLayers(layers);
            }
        }

        //user connected, set connected store for menu at true
        userIsConnected.set(true);
    }

    get currentRoom() {
        return this._currentRoom;
    }
}

export const connectionManager = new ConnectionManager();
