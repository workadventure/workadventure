import Axios from "axios";
import { ENABLE_OPENID, PUSHER_URL } from "../Enum/EnvironmentVariable";
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
import type { AvailabilityStatus } from "@workadventure/messages";
import { isRegisterData } from "@workadventure/messages";
import { limitMapStore } from "../Stores/GameStore";
import { showLimitRoomModalStore } from "../Stores/ModalStore";
import { gameManager } from "../Phaser/Game/GameManager";
import { locales } from "../../i18n/i18n-util";
import type { Locales } from "../../i18n/i18n-types";
import { setCurrentLocale } from "../../i18n/locales";

class ConnectionManager {
    private localUser!: LocalUser;

    private connexionType?: GameConnexionTypes;
    private reconnectingTimeout: NodeJS.Timeout | null = null;
    private _unloading = false;
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
     * Returns the URL that we need to redirect to load the OpenID screen, or "null" if no redirection needs to happen.
     */
    public loadOpenIDScreen(): URL | null {
        localUserStore.setAuthToken(null);
        // FIXME: remove this._currentRoom.iframeAuthentication
        // FIXME: remove this._currentRoom.iframeAuthentication
        // FIXME: remove this._currentRoom.iframeAuthentication
        // FIXME: remove this._currentRoom.iframeAuthentication
        if (!ENABLE_OPENID || !this._currentRoom || !this._currentRoom.iframeAuthentication) {
            loginSceneVisibleIframeStore.set(false);
            return null;
        }
        const redirectUrl = new URL(`${this._currentRoom.iframeAuthentication}`, window.location.href);
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

        //Go on root page
        window.location.assign(this._currentRoom?.opidLogoutRedirectUrl ?? "/");
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
            throw new Error("This endpoint is deprecated");
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

            const roomPathUrl = new URL(roomPath);

            //get detail map for anonymous login and set texture in local storage
            //before set token of user we must load room and all information. For example the mandatory authentication could be require on current room
            this._currentRoom = await Room.createRoom(roomPathUrl);

            //Set last room visited! (connected or nor, must to be saved in localstorage and cache API)
            //use href to keep # value
            await localUserStore.setLastRoomUrl(roomPathUrl.href);

            //todo: add here some kind of warning if authToken has expired.
            if (!this.authToken) {
                if (!this._currentRoom.authenticationMandatory) {
                    await this.anonymousLogin();
                } else {
                    const redirect = this.loadOpenIDScreen();
                    if (redirect === null) {
                        throw new Error("Unable to redirect on login page.");
                    }
                    return redirect;
                }
            } else {
                try {
                    await this.checkAuthUserConnexion(this.authToken);
                    analyticsClient.loggedWithSso();
                } catch (err) {
                    console.error(err);
                    // if the user must be connected in the current room or if the pusher error is not openid provider access error
                    // try to connect with function loadOpenIDScreen
                    if (
                        this._currentRoom.authenticationMandatory ||
                        (Axios.isAxiosError(err) &&
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

    public async anonymousLogin(isBenchmark = false): Promise<void> {
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
        companion: string | null,
        availabilityStatus: AvailabilityStatus
    ): Promise<OnConnectInterface> {
        return new Promise<OnConnectInterface>((resolve, reject) => {
            const connection = new RoomConnection(
                this.authToken,
                roomUrl,
                name,
                characterLayers,
                position,
                viewport,
                companion,
                availabilityStatus
            );

            connection.onConnectError((error: object) => {
                console.log("onConnectError => An error occurred while connecting to socket server. Retrying");
                reject(error);
            });

            connection.connectionErrorStream.subscribe((event: CloseEvent) => {
                console.info(
                    "An error occurred while connecting to socket server. Retrying => Event: ",
                    event.reason,
                    event.code,
                    event
                );

                //However, Chrome will rarely report any close code 1006 reasons to the Javascript side.
                //This is likely due to client security rules in the WebSocket spec to prevent abusing WebSocket.
                //(such as using it to scan for open ports on a destination server, or for generating lots of connections for a denial-of-service attack).
                // more detail here: https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1
                if (event.code === 1006) {
                    //check cookies
                    const cookies = document.cookie.split(";");
                    for (const cookie of cookies) {
                        //check id cookie posthog exist
                        const numberIndexPh = cookie.indexOf("_posthog=");
                        if (numberIndexPh !== -1) {
                            //if exist, remove posthog cookie
                            document.cookie =
                                cookie.slice(0, numberIndexPh + 9) +
                                "; domain=.workadventu.re; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
                        }
                    }
                }

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
            console.log("connectToRoomSocket => catch => new Promise[OnConnectInterface] => err", err);

            // Let's retry in 4-6 seconds
            return new Promise<OnConnectInterface>((resolve) => {
                console.log("connectToRoomSocket => catch => new Promise[OnConnectInterface] => reconnectingTimeout");

                this.reconnectingTimeout = setTimeout(() => {
                    //todo: allow a way to break recursion?
                    //todo: find a way to avoid recursive function. Otherwise, the call stack will grow indefinitely.
                    console.log(
                        "connectToRoomSocket => catch => ew Promise[OnConnectInterface] reconnectingTimeout => setTimeout",
                        roomUrl,
                        name,
                        characterLayers,
                        position,
                        viewport,
                        companion,
                        availabilityStatus
                    );
                    void this.connectToRoomSocket(
                        roomUrl,
                        name,
                        characterLayers,
                        position,
                        viewport,
                        companion,
                        availabilityStatus
                    ).then((connection) => resolve(connection));
                }, 4000 + Math.floor(Math.random() * 2000));
            });
        });
    }

    get getConnexionType() {
        return this.connexionType;
    }

    async checkAuthUserConnexion(token: string) {
        //set connected store for menu at false
        userIsConnected.set(false);

        const { authToken, userUuid, email, username, locale, textures, visitCardUrl } = await Axios.get(
            `${PUSHER_URL}/me`,
            {
                params: { token, playUri: this.currentRoom?.key },
            }
        ).then((res) => {
            return res.data;
        });

        localUserStore.setAuthToken(authToken);
        this.localUser = new LocalUser(userUuid, email);
        localUserStore.saveUser(this.localUser);
        this.authToken = authToken;

        if (visitCardUrl) {
            gameManager.setVisitCardurl(visitCardUrl);
        }

        const opidWokaNamePolicy = this.currentRoom?.opidWokaNamePolicy;
        if (username != undefined && opidWokaNamePolicy != undefined) {
            if (opidWokaNamePolicy === "force_opid") {
                gameManager.setPlayerName(username);
            } else if (opidWokaNamePolicy === "allow_override_opid" && localUserStore.getName() == undefined) {
                gameManager.setPlayerName(username);
            }
        }

        if (locale) {
            try {
                if (locales.indexOf(locale) !== -1) {
                    await setCurrentLocale(locale as Locales);
                } else {
                    const nonRegionSpecificLocale = locales.find((l) => l.startsWith(locale.split("-")[0]));
                    if (nonRegionSpecificLocale) {
                        await setCurrentLocale(nonRegionSpecificLocale);
                    }
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
        if (localUserStore.isLogged()) {
            userIsConnected.set(true);
        }
    }

    get currentRoom() {
        return this._currentRoom;
    }
}

export const connectionManager = new ConnectionManager();
