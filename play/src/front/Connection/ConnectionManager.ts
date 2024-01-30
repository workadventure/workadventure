import * as Sentry from "@sentry/svelte";
import type { AvailabilityStatus } from "@workadventure/messages";
import {
    ErrorApiErrorData,
    ErrorApiRetryData,
    ErrorApiUnauthorizedData,
    isRegisterData,
    MeResponse,
} from "@workadventure/messages";
import { isAxiosError } from "axios";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { subMenusStore, userIsConnected, warningContainerStore } from "../Stores/MenuStore";
import { loginSceneVisibleIframeStore } from "../Stores/LoginSceneStore";
import { _ServiceWorker } from "../Network/ServiceWorker";
import { GameConnexionTypes, urlManager } from "../Url/UrlManager";
import { ENABLE_OPENID } from "../Enum/EnvironmentVariable";
import { limitMapStore } from "../Stores/GameStore";
import { showLimitRoomModalStore } from "../Stores/ModalStore";
import { gameManager } from "../Phaser/Game/GameManager";
import { locales } from "../../i18n/i18n-util";
import type { Locales } from "../../i18n/i18n-types";
import { setCurrentLocale } from "../../i18n/locales";
import { axiosToPusher, axiosWithRetry } from "./AxiosUtils";
import { Room } from "./Room";
import { LocalUser } from "./LocalUser";
import { localUserStore } from "./LocalUserStore";
import type { OnConnectInterface, PositionInterface, ViewportInterface } from "./ConnexionModels";
import { RoomConnection } from "./RoomConnection";
import { HtmlUtils } from "./../WebRtc/HtmlUtils";
import { hasCapability } from "./Capabilities";

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
        analyticsClient.loggedWithSso();
        const redirectUrl = new URL(`${this._currentRoom.iframeAuthentication}`, window.location.href);
        redirectUrl.searchParams.append("playUri", this._currentRoom.key);
        return redirectUrl;
    }

    /**
     * Logout
     */
    public logout() {
        // save the current token to use it in the redirect logout url
        const tokenTmp = localUserStore.getAuthToken();
        //remove token in localstorage
        localUserStore.setAuthToken(null);
        //user logout, set connected store for menu at false
        userIsConnected.set(false);
        // check if we are in a room
        if (!ENABLE_OPENID || !this._currentRoom) {
            window.location.assign("/login");
            return;
        }
        // redirect to logout url
        const redirectUrl = new URL(`${this._currentRoom.opidLogoutRedirectUrl}`, window.location.href);
        redirectUrl.searchParams.append("playUri", this._currentRoom.key);
        redirectUrl.searchParams.append("token", tokenTmp ?? "");
        window.location.assign(redirectUrl);
    }

    /**
     * Tries to login to the node server and return the starting map url to be loaded
     *
     * @return returns a promise to the Room we are going to load OR a pointer to the URL we must redirect to if authentication is needed.
     */
    public async initGameConnexion(): Promise<
        | {
              room: Room;
              nextScene: "selectCharacterScene" | "selectCompanionScene" | "gameScene";
          }
        | {
              nextScene: "errorScene";
              error: ErrorApiErrorData | ErrorApiRetryData | ErrorApiUnauthorizedData | Error;
          }
        | URL
    > {
        this.connexionType = urlManager.getGameConnexionType();
        this._currentRoom = null;

        let nextScene: "selectCharacterScene" | "selectCompanionScene" | "gameScene" = "gameScene";

        const urlParams = new URLSearchParams(window.location.search);
        let token = urlParams.get("token");
        // get token injected by post method from pusher
        if (token == undefined) {
            const input = HtmlUtils.getElementByIdOrFail<HTMLInputElement>("authToken");
            if (input.value != undefined && input.value != "") token = input.value;
        }

        if (token != undefined) {
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
            const result = await axiosToPusher.post("register", { organizationMemberToken }).then((res) => res.data);

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

            //Set last room visited! (connected or not, must be saved in localstorage and cache API)
            //use href to keep # value
            await localUserStore.setLastRoomUrl(roomPathUrl.href);

            //todo: add here some kind of warning if authToken has expired.
            if (!this.authToken) {
                if (!this._currentRoom.authenticationMandatory) {
                    await this.anonymousLogin();

                    const characterTextures = localUserStore.getCharacterTextures();
                    if (characterTextures === null || characterTextures.length === 0) {
                        nextScene = "selectCharacterScene";
                    }
                } else {
                    const redirect = this.loadOpenIDScreen();
                    if (redirect === null) {
                        throw new Error("Unable to redirect on login page.");
                    }
                    return redirect;
                }
            } else {
                try {
                    const response = await this.checkAuthUserConnexion(this.authToken);
                    if (response.status === "error") {
                        /*if (response.type === "retry") {
                            console.warn("Token expired, trying to login anonymously");
                        } else {
                            console.error(response);
                        }*/

                        if (response.type === "redirect") {
                            return new URL(response.urlToRedirect);
                        }

                        if (response.type === "unauthorized") {
                            // if the user must be connected to the current room or if the pusher error is not openid provider access error
                            if (this._currentRoom.authenticationMandatory) {
                                const redirect = this.loadOpenIDScreen();
                                if (redirect === null) {
                                    return {
                                        nextScene: "errorScene",
                                        error: response,
                                    };
                                }
                                return redirect;
                            } else {
                                await this.anonymousLogin();
                            }
                        } else {
                            return {
                                nextScene: "errorScene",
                                error: response,
                            };
                        }
                    }
                    if (response.status === "ok") {
                        if (response.isCharacterTexturesValid === false) {
                            nextScene = "selectCharacterScene";
                        } else if (response.isCompanionTextureValid === false) {
                            nextScene = "selectCompanionScene";
                        }
                    }
                } catch (err) {
                    if (isAxiosError(err) && err.response?.status === 401) {
                        console.warn("Token expired, trying to login anonymously");
                        // if the user must be connected to the current room or if the pusher error is not openid provider access error
                        if (this._currentRoom.authenticationMandatory) {
                            const redirect = this.loadOpenIDScreen();
                            if (redirect === null) {
                                throw new Error("Unable to redirect on login page.");
                            }
                            return redirect;
                        } else {
                            await this.anonymousLogin();
                        }
                    } else {
                        Sentry.captureException(err);
                        if (err instanceof Error) {
                            return {
                                nextScene: "errorScene",
                                error: err,
                            };
                        } else {
                            console.error("An unknown error occurred", err);
                            return {
                                nextScene: "errorScene",
                                error: new Error("An unknown error occurred"),
                            };
                        }
                    }
                }
            }
            // Todo: Replace with a real typing
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

        // add report issue menu
        subMenusStore.addReportIssuesMenu();

        return Promise.resolve({
            room: this._currentRoom,
            nextScene,
        });
    }

    public async anonymousLogin(isBenchmark = false): Promise<void> {
        const data = await axiosWithRetry.post("anonymLogin").then((res) => res.data);
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
        characterTextureIds: string[],
        position: PositionInterface,
        viewport: ViewportInterface,
        companionTextureId: string | null,
        availabilityStatus: AvailabilityStatus,
        lastCommandId?: string
    ): Promise<OnConnectInterface> {
        return new Promise<OnConnectInterface>((resolve, reject) => {
            const connection = new RoomConnection(
                this.authToken,
                roomUrl,
                name,
                characterTextureIds,
                position,
                viewport,
                companionTextureId,
                availabilityStatus,
                lastCommandId
            );

            connection.onConnectError((error: object) => {
                console.info("onConnectError => An error occurred while connecting to socket server. Retrying");
                reject(error);
            });

            // The roomJoinedMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
            //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
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

            // The roomJoinedMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
            //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
            connection.roomJoinedMessageStream.subscribe((connect: OnConnectInterface) => {
                resolve(connect);
            });
        }).catch((err) => {
            console.info("connectToRoomSocket => catch => new Promise[OnConnectInterface] => err", err);

            // Let's retry in 4-6 seconds
            return new Promise<OnConnectInterface>((resolve) => {
                console.info("connectToRoomSocket => catch => new Promise[OnConnectInterface] => reconnectingTimeout");

                this.reconnectingTimeout = setTimeout(() => {
                    //todo: allow a way to break recursion?
                    //todo: find a way to avoid recursive function. Otherwise, the call stack will grow indefinitely.
                    console.info(
                        "connectToRoomSocket => catch => ew Promise[OnConnectInterface] reconnectingTimeout => setTimeout",
                        roomUrl,
                        name,
                        characterTextureIds,
                        position,
                        viewport,
                        companionTextureId,
                        availabilityStatus,
                        lastCommandId
                    );
                    void this.connectToRoomSocket(
                        roomUrl,
                        name,
                        characterTextureIds,
                        position,
                        viewport,
                        companionTextureId,
                        availabilityStatus,
                        lastCommandId
                    ).then((connection) => resolve(connection));
                }, 4000 + Math.floor(Math.random() * 2000));
            });
        });
    }

    get getConnexionType() {
        return this.connexionType;
    }

    private async checkAuthUserConnexion(token: string) {
        //set connected store for menu at false
        userIsConnected.set(false);

        const playUri = this.currentRoom?.key;
        if (playUri == undefined) {
            throw new Error("playUri is undefined");
        }

        // TODO: the call to "/me" could be completely removed and the request data could come from the FrontController
        // For this to work, the authToken should be stored in a cookie instead of localStorage.
        const data = await axiosToPusher
            .get("me", {
                params: {
                    token,
                    playUri,
                    localStorageCharacterTextureIds: localUserStore.getCharacterTextures() ?? undefined,
                    localStorageCompanionTextureId: localUserStore.getCompanionTextureId() ?? undefined,
                },
            })
            .then((res) => {
                return res.data;
            });

        const response = MeResponse.parse(data);

        if (response.status === "error") {
            return response;
        }

        const { authToken, userUuid, email, username, locale, visitCardUrl } = response;

        localUserStore.setAuthToken(authToken);
        this.localUser = new LocalUser(userUuid, email);
        localUserStore.saveUser(this.localUser);
        this.authToken = authToken;

        if (visitCardUrl) {
            gameManager.setVisitCardUrl(visitCardUrl);
        }

        const opidWokaNamePolicy = this.currentRoom?.opidWokaNamePolicy;
        if (username != undefined && opidWokaNamePolicy != undefined) {
            if (hasCapability("api/save-name")) {
                gameManager.setPlayerName(username);
            } else {
                if (opidWokaNamePolicy === "force_opid") {
                    gameManager.setPlayerName(username);
                } else if (opidWokaNamePolicy === "allow_override_opid" && localUserStore.getName() == undefined) {
                    gameManager.setPlayerName(username);
                }
            }
        }

        if (locale) {
            try {
                if (locales.indexOf(locale as Locales) !== -1) {
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

        //user connected, set connected store for menu at true
        if (localUserStore.isLogged()) {
            userIsConnected.set(true);
        }

        return response;
    }

    async saveName(name: string): Promise<void> {
        if (hasCapability("api/save-name") && this.authToken !== undefined) {
            await axiosToPusher.post(
                "save-name",
                {
                    name,
                    roomUrl: this.currentRoom?.key,
                },
                {
                    headers: {
                        Authorization: this.authToken,
                    },
                }
            );
        }
    }

    async saveTextures(textures: string[]): Promise<void> {
        if (hasCapability("api/save-textures") && this.authToken !== undefined) {
            await axiosToPusher.post(
                "save-textures",
                {
                    textures,
                    roomUrl: this.currentRoom?.key,
                },
                {
                    headers: {
                        Authorization: this.authToken,
                    },
                }
            );
        }
    }

    async saveCompanionTexture(texture: string): Promise<void> {
        if (hasCapability("api/save-textures") && this.authToken !== undefined) {
            await axiosToPusher.post(
                "save-companion-texture",
                {
                    texture,
                    roomUrl: this.currentRoom?.key,
                },
                {
                    headers: {
                        Authorization: this.authToken,
                    },
                }
            );
        }
    }

    get currentRoom() {
        return this._currentRoom;
    }
}

export const connectionManager = new ConnectionManager();
