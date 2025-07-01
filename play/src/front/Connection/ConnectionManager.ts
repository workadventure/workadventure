import * as Sentry from "@sentry/svelte";
import { get } from "svelte/store";
import type { ApplicationDefinitionInterface, AvailabilityStatus } from "@workadventure/messages";
import {
    ErrorApiErrorData,
    ErrorApiRetryData,
    ErrorApiUnauthorizedData,
    isRegisterData,
    MeResponse,
    ErrorScreenMessage,
} from "@workadventure/messages";
import { isAxiosError } from "axios";
import { KlaxoonService } from "@workadventure/shared-utils";
import { Subject } from "rxjs";
import { asError } from "catch-unknown";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { userIsConnected, warningBannerStore } from "../Stores/MenuStore";
import { loginSceneVisibleIframeStore } from "../Stores/LoginSceneStore";
import { _ServiceWorker } from "../Network/ServiceWorker";
import { GameConnexionTypes, urlManager } from "../Url/UrlManager";
import {
    CARDS_ENABLED,
    ENABLE_OPENID,
    ERASER_ENABLED,
    EXCALIDRAW_DOMAINS,
    EXCALIDRAW_ENABLED,
    GOOGLE_DOCS_ENABLED,
    GOOGLE_DRIVE_ENABLED,
    GOOGLE_SHEETS_ENABLED,
    GOOGLE_SLIDES_ENABLED,
    KLAXOON_CLIENT_ID,
    KLAXOON_ENABLED,
    YOUTUBE_ENABLED,
} from "../Enum/EnvironmentVariable";
import { limitMapStore } from "../Stores/GameStore";
import { showLimitRoomModalStore } from "../Stores/ModalStore";
import { gameManager } from "../Phaser/Game/GameManager";
import { locales } from "../../i18n/i18n-util";
import type { Locales } from "../../i18n/i18n-types";
import { setCurrentLocale } from "../Utils/locales";
import { ABSOLUTE_PUSHER_URL } from "../Enum/ComputedConst";
import { openChatRoom } from "../Chat/Utils";
import LL from "../../i18n/i18n-svelte";
import waLogo from "../Components/images/logo.svg";
import { errorScreenStore } from "../Stores/ErrorScreenStore";
import { axiosToPusher, axiosWithRetry } from "./AxiosUtils";
import { Room } from "./Room";
import { LocalUser } from "./LocalUser";
import { localUserStore } from "./LocalUserStore";
import type { OnConnectInterface, PositionInterface, ViewportInterface } from "./ConnexionModels";
import { RoomConnection } from "./RoomConnection";
import { HtmlUtils } from "./../WebRtc/HtmlUtils";
import { hasCapability } from "./Capabilities";
export const enum defautlNativeIntegrationAppName {
    KLAXOON = "Klaxoon",
    YOUTUBE = "Youtube",
    GOOGLE_DRIVE = "Google Drive",
    GOOGLE_DOCS = "Google Docs",
    GOOGLE_SHEETS = "Google Sheets",
    GOOGLE_SLIDES = "Google Slides",
    ERASER = "Eraser",
    EXCALIDRAW = "Excalidraw",
    CARDS = "Cards",
}

class ConnectionManager {
    private localUser!: LocalUser;

    private connexionType?: GameConnexionTypes;
    private reconnectingTimeout: NodeJS.Timeout | null = null;
    private _unloading = false;
    private authToken: string | null = null;
    private _currentRoom: Room | null = null;

    private serviceWorker?: _ServiceWorker;

    private _klaxoonToolActivated: boolean | undefined;
    private _klaxoonToolClientId: string | undefined;
    private _youtubeToolActivated: boolean | undefined;
    private _googleDocsToolActivated: boolean | undefined;
    private _googleSheetsToolActivated: boolean | undefined;
    private _googleSlidesToolActivated: boolean | undefined;
    private _eraserToolActivated: boolean | undefined;
    private _googleDriveActivated: boolean | undefined;
    private _excalidrawToolActivated: boolean | undefined;
    private _excalidrawToolDomains: string[] | undefined;
    private _cardsToolActivated: boolean | undefined;

    private _applications: ApplicationDefinitionInterface[] = [];

    private readonly _roomConnectionStream = new Subject<RoomConnection>();
    public readonly roomConnectionStream = this._roomConnectionStream.asObservable();

    get unloading() {
        return this._unloading;
    }

    constructor() {
        window.addEventListener("beforeunload", () => {
            this._unloading = true;
            if (this.reconnectingTimeout) clearTimeout(this.reconnectingTimeout);
        });

        // Initialise default application
        this.klaxoonToolActivated = KLAXOON_ENABLED;
        this._klaxoonToolClientId = KLAXOON_CLIENT_ID;
        if (this._klaxoonToolClientId) {
            KlaxoonService.initWindowKlaxoonActivityPicker();
        }
        this.youtubeToolActivated = YOUTUBE_ENABLED;
        this.googleDriveToolActivated = GOOGLE_DRIVE_ENABLED;
        this.googleDocsToolActivated = GOOGLE_DOCS_ENABLED;
        this.googleSheetsToolActivated = GOOGLE_SHEETS_ENABLED;
        this.googleSlidesToolActivated = GOOGLE_SLIDES_ENABLED;
        this.eraserToolActivated = ERASER_ENABLED;
        this.excalidrawToolActivated = EXCALIDRAW_ENABLED;
        this.excalidrawToolDomains = EXCALIDRAW_DOMAINS;
        this.cardsToolActivated = CARDS_ENABLED;
    }

    /**
     * TODO fix me to be move in game manager
     *
     * Returns the URL that we need to redirect to load the OpenID screen, or "null" if no redirection needs to happen.
     *
     * @param manuallyTriggered - Whether the login request resulted from a click on the "Sign in" button or from a mandatory authentication.
     */
    public loadOpenIDScreen(manuallyTriggered: boolean): URL | null {
        localUserStore.setAuthToken(null);
        if (!ENABLE_OPENID || !this._currentRoom) {
            analyticsClient.loggedWithToken();
            loginSceneVisibleIframeStore.set(false);
            return null;
        }
        analyticsClient.loggedWithSso();
        const redirectUrl = new URL("login-screen", ABSOLUTE_PUSHER_URL);
        redirectUrl.searchParams.append("playUri", this._currentRoom.key);
        if (manuallyTriggered) {
            redirectUrl.searchParams.append("manuallyTriggered", "true");
        }
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
        //user logout, set connected store for menu at false (actually don't do it because we are going to redirect and
        // it shortly displays the "sign in" button before redirect happens)
        //userIsConnected.set(false);

        // check if we are in a room
        if (!ENABLE_OPENID || !this._currentRoom) {
            window.location.assign("/login");
            return;
        }
        // redirect to logout url
        const redirectUrl = new URL(`${this._currentRoom.opidLogoutRedirectUrl}`, window.location.href);
        redirectUrl.searchParams.append("playUri", this._currentRoom.key);
        redirectUrl.searchParams.append("token", tokenTmp ?? "");

        gameManager
            .logout()
            .catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            })
            .finally(() => window.location.assign(redirectUrl));
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

        let matrixLoginToken = urlParams.get("matrixLoginToken");
        // get token injected by post method from pusher
        if (matrixLoginToken == undefined) {
            const input = HtmlUtils.getElementByIdOrFail<HTMLInputElement>("matrixLoginToken");
            if (input.value != undefined && input.value != "") {
                matrixLoginToken = input.value;
            }
        }

        if (matrixLoginToken != undefined) {
            localUserStore.setMatrixLoginToken(matrixLoginToken);
            //clean token of url
            urlParams.delete("matrixLoginToken");
        }

        if (this.connexionType === GameConnexionTypes.login) {
            this._currentRoom = await Room.createRoom(new URL(localUserStore.getLastRoomUrl()));
            const redirect = this.loadOpenIDScreen(true);
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
                    const redirect = this.loadOpenIDScreen(false);
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
                            return new URL(response.urlToRedirect, window.location.href);
                        }

                        return {
                            nextScene: "errorScene",
                            error: response,
                        };
                    }
                    if (response.status === "ok") {
                        if (response.isCharacterTexturesValid === false) {
                            nextScene = "selectCharacterScene";
                        } else if (response.isCompanionTextureValid === false) {
                            nextScene = "selectCompanionScene";
                        }

                        const chatRoomId = urlManager.getHashParameter("chatRoomId");

                        if (chatRoomId) {
                            openChatRoom(chatRoomId).catch((err) => {
                                console.error("Unable to open chat room or establish chat connection", err);
                                Sentry.captureException(err);
                            });
                        }
                    }
                } catch (err) {
                    if (isAxiosError(err) && err.response?.status === 401) {
                        console.warn("Token expired, trying to login anonymously");
                        // if the user must be connected to the current room or if the pusher error is not openid provider access error
                        if (this._currentRoom.authenticationMandatory) {
                            const redirect = this.loadOpenIDScreen(false);
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
            warningBannerStore.activateWarningContainer();
            limitMapStore.set(true);

            //check time of map
            if (new Date() > this._currentRoom.expireOn) {
                showLimitRoomModalStore.set(true);
            }
        }

        this.serviceWorker = new _ServiceWorker();

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
        this.anonymousMatrixLogin();
    }

    private anonymousMatrixLogin() {
        localUserStore.setMatrixLoginToken(null);
        localUserStore.setMatrixUserId(null);
        localUserStore.setMatrixAccessToken(null);
        localUserStore.setMatrixRefreshToken(null);
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
                reject(asError(error));
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
                // Set the default application integration for the room
                const KlaxoonApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.KLAXOON
                );
                this.klaxoonToolActivated = KlaxoonApp?.enabled ?? KLAXOON_ENABLED;

                const YoutubeApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.YOUTUBE
                );
                this.youtubeToolActivated = YoutubeApp?.enabled ?? YOUTUBE_ENABLED;

                const GoogleDriveApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.GOOGLE_DRIVE
                );
                this.googleDriveToolActivated = GoogleDriveApp?.enabled ?? GOOGLE_DRIVE_ENABLED;

                const GoogleDocsApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.GOOGLE_DOCS
                );
                this.googleDocsToolActivated = GoogleDocsApp?.enabled ?? GOOGLE_DOCS_ENABLED;

                const GoogleSheetsApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.GOOGLE_SHEETS
                );
                this.googleSheetsToolActivated = GoogleSheetsApp?.enabled ?? GOOGLE_SHEETS_ENABLED;

                const GoogleSlidesApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.GOOGLE_SLIDES
                );
                this.googleSlidesToolActivated = GoogleSlidesApp?.enabled ?? GOOGLE_SLIDES_ENABLED;

                const EraserApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.ERASER
                );
                this.eraserToolActivated = EraserApp?.enabled ?? ERASER_ENABLED;

                const ExcalidrawApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.EXCALIDRAW
                );
                this.excalidrawToolActivated = ExcalidrawApp?.enabled ?? EXCALIDRAW_ENABLED;

                const CardsApp = connect.room.applications?.find(
                    (app) => app.name === defautlNativeIntegrationAppName.CARDS
                );
                this.cardsToolActivated = CardsApp?.enabled ?? CARDS_ENABLED;

                // Set other applications
                for (const app of connect.room.applications ?? []) {
                    if (
                        defautlNativeIntegrationAppName.KLAXOON === app.name ||
                        defautlNativeIntegrationAppName.YOUTUBE === app.name ||
                        defautlNativeIntegrationAppName.GOOGLE_DRIVE === app.name ||
                        defautlNativeIntegrationAppName.GOOGLE_DOCS === app.name ||
                        defautlNativeIntegrationAppName.GOOGLE_SHEETS === app.name ||
                        defautlNativeIntegrationAppName.GOOGLE_SLIDES === app.name ||
                        defautlNativeIntegrationAppName.ERASER === app.name ||
                        defautlNativeIntegrationAppName.EXCALIDRAW === app.name ||
                        defautlNativeIntegrationAppName.CARDS === app.name
                    ) {
                        continue;
                    }

                    // Save applications in the connection manager to use it in the map editor
                    if (this._applications.find((a) => a.name === app.name) === undefined) {
                        this._applications.push(app);
                    }
                }
                this._roomConnectionStream.next(connection);
                errorScreenStore.delete();
                resolve(connect);
            });
        }).catch((err) => {
            console.info("connectToRoomSocket => catch => new Promise[OnConnectInterface] => err", err);

            errorScreenStore.setError(
                ErrorScreenMessage.fromPartial({
                    type: "reconnecting",
                    code: "reconnecting",
                    title: get(LL).messageScreen.connecting(),
                    subtitle: get(LL).messageScreen.pleaseWait(),
                    image: gameManager?.currentStartedRoom?.loadingLogo ?? waLogo,
                })
            );
            // Let's retry in 4-6 seconds
            return new Promise<OnConnectInterface>((resolve) => {
                console.info("connectToRoomSocket => catch => new Promise[OnConnectInterface] => reconnectingTimeout");

                this.reconnectingTimeout = setTimeout(() => {
                    //todo: allow a way to break recursion?
                    //todo: find a way to avoid recursive function. Otherwise, the call stack will grow indefinitely.
                    console.info(
                        "[ConnectionManager] connectToRoomSocket => catch => ew Promise[OnConnectInterface] reconnectingTimeout => setTimeout",
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
                    ).then((connection) => {
                        this._roomConnectionStream.next(connection.connection);
                        resolve(connection);
                    });
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
                    chatID: localUserStore.getChatId() ?? undefined,
                },
            })
            .then((res) => {
                return res.data;
            })
            .catch((err) => {
                throw err;
            });

        const response = MeResponse.parse(data);

        if (response.status === "error") {
            return response;
        }

        const { authToken, userUuid, email, username, locale, visitCardUrl, matrixUserId, matrixServerUrl } = response;

        localUserStore.setAuthToken(authToken);
        this.localUser = new LocalUser(userUuid, email, matrixUserId /*, isMatrixRegistered*/);
        localUserStore.saveUser(this.localUser);
        this.authToken = authToken;

        if (matrixServerUrl) {
            gameManager.setMatrixServerUrl(matrixServerUrl);
        } else {
            gameManager.setMatrixServerUrl(undefined);
        }

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

    async saveName(name: string): Promise<boolean> {
        if (
            hasCapability("api/save-name") &&
            this.authToken !== undefined &&
            (this.currentRoom?.isLogged || !this.currentRoom)
        ) {
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
            return true;
        } else {
            return false;
        }
    }

    async saveTextures(textures: string[]): Promise<boolean> {
        if (
            hasCapability("api/save-textures") &&
            this.authToken !== undefined &&
            (this.currentRoom?.isLogged || !this.currentRoom)
        ) {
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
            return true;
        } else {
            return false;
        }
    }

    async saveCompanionTexture(texture: string | null): Promise<boolean> {
        if (
            hasCapability("api/save-textures") &&
            this.authToken !== undefined &&
            (this.currentRoom?.isLogged || !this.currentRoom)
        ) {
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
            return true;
        } else {
            return false;
        }
    }

    get currentRoom() {
        return this._currentRoom;
    }

    get klaxoonToolActivated(): boolean {
        return this._klaxoonToolActivated ?? false;
    }
    set klaxoonToolActivated(activated: boolean | undefined) {
        this._klaxoonToolActivated = activated;
    }
    get klaxoonToolClientId(): string | undefined {
        return this._klaxoonToolClientId;
    }

    get youtubeToolActivated(): boolean {
        return this._youtubeToolActivated ?? false;
    }
    set youtubeToolActivated(activated: boolean | undefined) {
        this._youtubeToolActivated = activated;
    }

    get googleDocsToolActivated(): boolean {
        return this._googleDocsToolActivated ?? false;
    }
    set googleDocsToolActivated(activated: boolean | undefined) {
        this._googleDocsToolActivated = activated;
    }

    get googleSheetsToolActivated(): boolean {
        return this._googleSheetsToolActivated ?? false;
    }
    set googleSheetsToolActivated(activated: boolean | undefined) {
        this._googleSheetsToolActivated = activated;
    }

    get googleSlidesToolActivated(): boolean {
        return this._googleSlidesToolActivated ?? false;
    }
    set googleSlidesToolActivated(activated: boolean | undefined) {
        this._googleSlidesToolActivated = activated;
    }

    get eraserToolActivated(): boolean {
        return this._eraserToolActivated ?? false;
    }
    set eraserToolActivated(activated: boolean | undefined) {
        this._eraserToolActivated = activated;
    }

    get googleDriveToolActivated(): boolean {
        return this._googleDriveActivated ?? false;
    }
    set googleDriveToolActivated(activated: boolean | undefined) {
        this._googleDriveActivated = activated;
    }

    get excalidrawToolActivated(): boolean {
        return this._excalidrawToolActivated ?? false;
    }
    set excalidrawToolActivated(activated: boolean | undefined) {
        this._excalidrawToolActivated = activated;
    }

    get excalidrawToolDomains(): string[] {
        return this._excalidrawToolDomains ?? [];
    }
    set excalidrawToolDomains(domains: string[] | undefined) {
        this._excalidrawToolDomains = domains;
    }

    get cardsToolActivated(): boolean {
        return this._cardsToolActivated ?? false;
    }
    set cardsToolActivated(activated: boolean | undefined) {
        this._cardsToolActivated = activated;
    }

    get applications(): ApplicationDefinitionInterface[] {
        return this._applications;
    }
}

export const connectionManager = new ConnectionManager();
