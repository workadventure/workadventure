import type { Unsubscriber } from "svelte/store";
import { get } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import { connectionManager } from "../../Connection/ConnectionManager";
import { localUserStore } from "../../Connection/LocalUserStore";
import type { Room } from "../../Connection/Room";
import { showHelpCameraSettings } from "../../Stores/HelpSettingsStore";
import {
    availabilityStatusStore,
    requestedCameraDeviceIdStore,
    requestedCameraState,
    requestedMicrophoneDeviceIdStore,
    requestedMicrophoneState,
} from "../../Stores/MediaStore";
import { menuIconVisiblilityStore, userIsConnected } from "../../Stores/MenuStore";
import { EnableCameraSceneName } from "../Login/EnableCameraScene";
import { LoginSceneName } from "../Login/LoginScene";
import { SelectCharacterSceneName } from "../Login/SelectCharacterScene";
import { EmptySceneName } from "../Login/EmptyScene";
import { gameSceneIsLoadedStore, waitForGameSceneStore } from "../../Stores/GameSceneStore";
import { myCameraStore } from "../../Stores/MyMediaStore";
import { SelectCompanionSceneName } from "../Login/SelectCompanionScene";
import { errorScreenStore } from "../../Stores/ErrorScreenStore";
import { hasCapability } from "../../Connection/Capabilities";
import type { ChatConnectionInterface } from "../../Chat/Connection/ChatConnection";
import { MATRIX_PUBLIC_URI } from "../../Enum/EnvironmentVariable";
import { InvalidLoginTokenError, MatrixClientWrapper } from "../../Chat/Connection/Matrix/MatrixClientWrapper";
import { MatrixChatConnection } from "../../Chat/Connection/Matrix/MatrixChatConnection";
import { VoidChatConnection } from "../../Chat/Connection/VoidChatConnection";
import { loginTokenErrorStore, isMatrixChatEnabledStore } from "../../Stores/ChatStore";
import { initializeChatVisibilitySubscription } from "../../Chat/Stores/ChatStore";
import { ABSOLUTE_PUSHER_URL } from "../../Enum/ComputedConst";
import type { WokaData } from "../../Components/Woka/WokaTypes";
import { generateRandomName } from "../../Utils/RandomNameGenerator";
import { GameScene } from "./GameScene";
/**
 * This class should be responsible for any scene starting/stopping
 */
export class GameManager {
    private playerName: string | null;
    private characterTextureIds: string[] | null;
    private companionTextureId: string | null;
    private startRoom!: Room;
    private currentGameSceneName: string | null = null;
    // Note: this scenePlugin is the scenePlugin of the EntryScene. We should always provide a key in methods called on this scenePlugin.
    private scenePlugin!: Phaser.Scenes.ScenePlugin;
    private visitCardUrl: string | null = null;
    private matrixServerUrl: string | undefined = undefined;
    private chatConnectionPromise: Promise<ChatConnectionInterface> | undefined;
    private matrixClientWrapper: MatrixClientWrapper | undefined;
    private _chatConnection: ChatConnectionInterface | undefined;
    private chatVisibilitySubscription: Unsubscriber | undefined;

    constructor() {
        this.playerName = localUserStore.getName();
        this.characterTextureIds = localUserStore.getCharacterTextures();
        this.companionTextureId = localUserStore.getCompanionTextureId();
        this.chatVisibilitySubscription = initializeChatVisibilitySubscription();
    }

    public async init(scenePlugin: Phaser.Scenes.ScenePlugin): Promise<string> {
        this.scenePlugin = scenePlugin;
        const result = await connectionManager.initGameConnexion();
        if (result instanceof URL) {
            window.location.assign(result.toString());
            // window.location.assign is not immediate and Javascript keeps running after.
            // so we need to redirect to an empty Phaser scene, waiting for the redirection to take place
            return EmptySceneName;
        }
        if (result.nextScene === "errorScene") {
            if (result.error instanceof Error) {
                errorScreenStore.setException(result.error);
            } else {
                errorScreenStore.setErrorFromApi(result.error);
            }
            return EmptySceneName;
        }
        let nextScene = result.nextScene;
        this.startRoom = result.room;
        this.loadMap(this.startRoom);

        const preferredAudioInputDeviceId = localUserStore.getPreferredAudioInputDevice();
        const preferredVideoInputDeviceId = localUserStore.getPreferredVideoInputDevice();

        if (!this.playerName) {
            // Handle woka name based on provideDefaultWokaName setting
            const provideDefaultWokaName = this.startRoom.provideDefaultWokaName;

            if (provideDefaultWokaName === "random") {
                // Use a random fun name based on current locale
                this.playerName = generateRandomName();
                localUserStore.setName(this.playerName);
            } else if (provideDefaultWokaName === "fix" && this.startRoom.defaultWokaNameSetting) {
                // Use the fixed name as-is
                this.playerName = this.startRoom.defaultWokaNameSetting;
                localUserStore.setName(this.playerName);
            } else if (provideDefaultWokaName === "fix-plus-random-numbers" && this.startRoom.defaultWokaNameSetting) {
                // Use the fixed name with random numbers appended
                const randomNumber = Math.floor(Math.random() * 1000)
                    .toString()
                    .padStart(3, "0");
                this.playerName = `${this.startRoom.defaultWokaNameSetting}-${randomNumber}`;
                localUserStore.setName(this.playerName);
            }
        }

        // Handle woka texture based on provideDefaultWokaTexture setting
        if (!this.characterTextureIds || this.characterTextureIds.length === 0) {
            if (this.startRoom.provideDefaultWokaTexture === "random") {
                const wokaData = await this.loadWokaData();
                const randomIndexCollections = Math.floor(Math.random() * wokaData.woka.collections.length);
                const randomIndexTextures = Math.floor(
                    Math.random() * wokaData.woka.collections[randomIndexCollections].textures.length
                );
                const defaultWokaTextureId =
                    wokaData.woka.collections[randomIndexCollections].textures[randomIndexTextures].id;
                this.characterTextureIds = [defaultWokaTextureId];
                localUserStore.setCharacterTextures(this.characterTextureIds);
                nextScene = "gameScene";
            } else if (this.startRoom.provideDefaultWokaTexture === "fix" && this.startRoom.defaultWokaTexture) {
                // Use the fixed texture from DEFAULT_WOKA_TEXTURE
                this.characterTextureIds = [this.startRoom.defaultWokaTexture];
                localUserStore.setCharacterTextures(this.characterTextureIds);
                nextScene = "gameScene";
            }
        }

        // Skip camera page if configured
        if (this.startRoom.skipCameraPage) {
            requestedMicrophoneState.disableMicrophone();
            requestedCameraState.disableWebcam();

            if (preferredAudioInputDeviceId && preferredAudioInputDeviceId !== "") {
                requestedMicrophoneDeviceIdStore.set(preferredAudioInputDeviceId);
            }
            if (preferredVideoInputDeviceId && preferredVideoInputDeviceId !== "") {
                requestedCameraDeviceIdStore.set(preferredVideoInputDeviceId);
            }
        }

        //If player name was not set show login scene with player name
        //If Room si not public and Auth was not set, show login scene to authenticate user (OpenID - SSO - Anonymous)
        if (!this.playerName || (this.startRoom.authenticationMandatory && !localUserStore.getAuthToken())) {
            return LoginSceneName;
        } else if (nextScene === "selectCharacterScene") {
            return SelectCharacterSceneName;
        } else if (nextScene === "selectCompanionScene") {
            return SelectCompanionSceneName;
        } else if (
            (preferredVideoInputDeviceId === undefined || preferredAudioInputDeviceId === undefined) &&
            !this.startRoom.skipCameraPage
        ) {
            return EnableCameraSceneName;
        } else {
            if (preferredVideoInputDeviceId !== "") {
                requestedCameraDeviceIdStore.set(preferredVideoInputDeviceId);
            }

            if (preferredAudioInputDeviceId !== "") {
                requestedMicrophoneDeviceIdStore.set(preferredAudioInputDeviceId);
            }

            this.activeMenuSceneAndHelpCameraSettings();
            //TODO fix to return href with # saved in localstorage
            return this.startRoom.key;
        }
    }

    public setPlayerName(name: string): void {
        this.playerName = name;
    }

    public setVisitCardUrl(visitCardUrl: string): void {
        this.visitCardUrl = visitCardUrl;
    }

    public setCharacterTextureIds(textureIds: string[]): void {
        this.characterTextureIds = textureIds;
        // Only save the textures if the user is not logged in
        // If the user is logged in, the textures will be fetched from the server. No need to save them locally.
        if (!localUserStore.isLogged() || !hasCapability("api/save-textures")) {
            localUserStore.setCharacterTextures(textureIds);
        }
    }

    getPlayerName(): string | null {
        return this.playerName;
    }

    get myVisitCardUrl(): string | null {
        return this.visitCardUrl;
    }

    getCharacterTextureIds(): string[] | null {
        return this.characterTextureIds;
    }

    setCompanionTextureId(textureId: string | null): void {
        this.companionTextureId = textureId;
    }

    getCompanionTextureId(): string | null {
        return this.companionTextureId;
    }

    public loadMap(room: Room) {
        const roomID = room.key;

        const gameIndex = this.scenePlugin.getIndex(roomID);
        if (gameIndex === -1) {
            const game: Phaser.Scene = new GameScene(room);
            this.scenePlugin.add(roomID, game, false);
        }
    }

    public goToStartingMap(): void {
        console.info("starting " + (this.currentGameSceneName || this.startRoom.key));
        this.scenePlugin.start(this.currentGameSceneName || this.startRoom.key);
        this.activeMenuSceneAndHelpCameraSettings();
    }

    /**
     * @private
     * @return void
     */
    private activeMenuSceneAndHelpCameraSettings(): void {
        if (!get(myCameraStore)) {
            return;
        }

        if (
            !localUserStore.getHelpCameraSettingsShown() &&
            (!get(requestedMicrophoneState) || !get(requestedCameraState))
        ) {
            showHelpCameraSettings();
            localUserStore.setHelpCameraSettingsShown();
        }
    }

    public gameSceneIsCreated(scene: GameScene) {
        this.currentGameSceneName = scene.scene.key;
        menuIconVisiblilityStore.set(true);
    }

    /**
     * Temporary leave a gameScene to go back to the loginScene for example.
     * This will close the socket connections and stop the gameScene, but won't remove it.
     */
    leaveGame(targetSceneName: string, sceneClass: Phaser.Scene): void {
        this.closeGameScene();
        if (!this.scenePlugin.get(targetSceneName)) {
            this.scenePlugin.add(targetSceneName, sceneClass, false);
        }
        this.scenePlugin.run(targetSceneName);
    }

    closeGameScene(): void {
        gameSceneIsLoadedStore.set(false);
        const gameScene = this.scenePlugin.get(this.currentGameSceneName ?? "default");

        if (!(gameScene instanceof GameScene)) {
            throw new Error("Not the Game Scene");
        }

        gameScene.cleanupClosingScene();
        gameScene.createSuccessorGameScene(false, false);
        menuIconVisiblilityStore.set(false);
    }

    /**
     * follow up to leaveGame()
     */
    goToNextScene(currentSceneName: "LoginScene" | "SelectCharacterScene" | "SelectCompanionScene") {
        if (this.currentGameSceneName) {
            // If there is a current game scene (it means we left this game scene to configure settings or so), then we restart it
            this.scenePlugin.start(this.currentGameSceneName);
            menuIconVisiblilityStore.set(true);
        } else {
            // If we are currently in the LoginScene and if we don't have a character selected, we go to SelectCharacterScene
            if (
                currentSceneName === LoginSceneName &&
                (!this.characterTextureIds || this.characterTextureIds.length === 0)
            ) {
                this.scenePlugin.run(SelectCharacterSceneName);
                return;
            }
            if (
                (currentSceneName === SelectCompanionSceneName ||
                    currentSceneName === LoginSceneName ||
                    currentSceneName === SelectCharacterSceneName) &&
                !this.startRoom.skipCameraPage
            ) {
                this.scenePlugin.run(EnableCameraSceneName);
                return;
            }
            this.scenePlugin.run(this.startRoom.key);
        }
    }

    /**
     * Tries to stop the current scene.
     * @param fallbackSceneName
     */
    tryToStopScene(fallbackSceneName: string) {
        this.scenePlugin.stop(fallbackSceneName);
    }

    public getCurrentGameScene(): GameScene {
        const gameScene = this.scenePlugin.get(
            this.currentGameSceneName == undefined ? "default" : this.currentGameSceneName
        );
        if (!(gameScene instanceof GameScene)) {
            throw new GameSceneNotFoundError("Not the Game Scene");
        }
        return gameScene;
    }

    public get currentStartedRoom() {
        return this.startRoom;
    }

    public setMatrixServerUrl(matrixServerUrl: string | undefined) {
        this.matrixServerUrl = matrixServerUrl;
    }

    public getMatrixServerUrl(): string | undefined {
        return this.matrixServerUrl;
    }

    public async getChatConnection(): Promise<ChatConnectionInterface> {
        if (this.chatConnectionPromise) {
            return this.chatConnectionPromise;
        }

        const matrixServerUrl = this.getMatrixServerUrl() ?? MATRIX_PUBLIC_URI;

        if (matrixServerUrl && get(userIsConnected)) {
            this.matrixClientWrapper = new MatrixClientWrapper(matrixServerUrl, localUserStore);

            const matrixClientPromise = this.matrixClientWrapper.initMatrixClient();

            matrixClientPromise.catch((e) => {
                if (e instanceof InvalidLoginTokenError) {
                    loginTokenErrorStore.set(true);
                }
            });

            const matrixChatConnection = new MatrixChatConnection(matrixClientPromise, availabilityStatusStore);
            this._chatConnection = matrixChatConnection;

            this.chatConnectionPromise = matrixChatConnection.init().then(() => matrixChatConnection);
            isMatrixChatEnabledStore.set(true);

            try {
                const gameScene = await waitForGameSceneStore();

                if (gameScene.room.isChatEnabled) {
                    return this.chatConnectionPromise;
                }
            } catch (e) {
                console.error(e);
                Sentry.captureException(e);
            }

            matrixChatConnection.destroy().catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });
            return new VoidChatConnection();
        } else {
            // No matrix connection? Let's fill the gap with a "void" object
            this._chatConnection = new VoidChatConnection();
            isMatrixChatEnabledStore.set(false);
            return this._chatConnection;
        }
    }
    get chatConnection(): ChatConnectionInterface {
        if (!this._chatConnection) {
            throw new Error("_chatConnection not yet initialized");
        }
        return this._chatConnection;
    }

    /**
     * Performs all cleanup actions specific to someone logging out.
     * Currently, this logs out from the Matrix client.
     */
    public async logout(): Promise<void> {
        if (this._chatConnection) {
            try {
                this._chatConnection.clearListener();
                await this._chatConnection.destroy();
                if (this.chatVisibilitySubscription) {
                    this.chatVisibilitySubscription();
                }
                this.clearChatDataFromLocalStorage();
                this._chatConnection = undefined;
                this.chatConnectionPromise = undefined;
            } catch (e) {
                console.error("Chat connection not closed properly : ", e);
                Sentry.captureException(e);
            }
        }
    }

    private clearChatDataFromLocalStorage(): void {
        localUserStore.setMatrixLoginToken(null);
        localUserStore.setMatrixUserId(null);
        localUserStore.setMatrixAccessToken(null);
        localUserStore.setMatrixRefreshToken(null);
    }

    public async loadWokaData(): Promise<WokaData> {
        const roomUrl = gameManager.currentStartedRoom.href;
        const response = await fetch(`${ABSOLUTE_PUSHER_URL}woka/list?roomUrl=${encodeURIComponent(roomUrl)}`, {
            headers: {
                Authorization: localUserStore.getAuthToken() || "",
            },
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error("Failed to load Woka data");
        }

        const data = await response.json();
        return data as unknown as WokaData;
    }
}

export const gameManager = new GameManager();

export class GameSceneNotFoundError extends Error {
    constructor(message: string) {
        super(message);
    }
}
