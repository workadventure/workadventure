import * as Sentry from "@sentry/svelte";
import type { Subscription } from "rxjs";
import AnimatedTiles from "phaser-animated-tiles";
import { Queue } from "queue-typescript";
import { ComponentType } from "svelte";
import type { Readable, Unsubscriber } from "svelte/store";
import { get } from "svelte/store";
import { throttle } from "throttle-debounce";
import { MapStore } from "@workadventure/store-utils";
import { MathUtils } from "@workadventure/math-utils";
import CancelablePromise from "cancelable-promise";
import { Deferred } from "ts-deferred";
import {
    AvailabilityStatus,
    availabilityStatusToJSON,
    ErrorScreenMessage,
    FilterType,
    GroupUsersUpdateMessage,
    PositionMessage_Direction,
} from "@workadventure/messages";
import { z } from "zod";
import { ITiledMap, ITiledMapLayer, ITiledMapObject, ITiledMapTileset } from "@workadventure/tiled-map-type-guard";
import {
    AreaData,
    ENTITIES_FOLDER_PATH_NO_PREFIX,
    ENTITY_COLLECTION_FILE,
    EntityPermissions,
    EntityPrefabType,
    GameMap,
    GameMapProperties,
    WAMFileFormat,
} from "@workadventure/map-editor";
import { wamFileMigration } from "@workadventure/map-editor/src/Migrations/WamFileMigration";
import { slugify } from "@workadventure/shared-utils/src/Jitsi/slugify";
import { userMessageManager } from "../../Administration/UserMessageManager";
import { connectionManager } from "../../Connection/ConnectionManager";
import { urlManager } from "../../Url/UrlManager";
import { mediaManager } from "../../WebRtc/MediaManager";
import { UserInputManager } from "../UserInput/UserInputManager";
import { touchScreenManager } from "../../Touch/TouchScreenManager";
import { PinchManager } from "../UserInput/PinchManager";
import { waScaleManager } from "../Services/WaScaleManager";
import { lazyLoadPlayerCharacterTextures } from "../Entity/PlayerTexturesLoadingManager";
import { lazyLoadPlayerCompanionTexture } from "../Companion/CompanionTexturesLoadingManager";
import { iframeListener } from "../../Api/IframeListener";
import { coWebsiteManager, coWebsites } from "../../Stores/CoWebsiteStore";
import {
    ADMIN_URL,
    DEBUG_MODE,
    ENABLE_CHAT_DISCONNECTED_LIST,
    ENABLE_MAP_EDITOR,
    ENABLE_OPENID,
    MAX_PER_GROUP,
    POSITION_DELAY,
    PUBLIC_MAP_STORAGE_PREFIX,
} from "../../Enum/EnvironmentVariable";
import { Room } from "../../Connection/Room";
import { CharacterTextureError } from "../../Exception/CharacterTextureError";
import { localUserStore } from "../../Connection/LocalUserStore";
import { HtmlUtils } from "../../WebRtc/HtmlUtils";
import { Loader } from "../Components/Loader";
import { RemotePlayer } from "../Entity/RemotePlayer";
import { SelectCharacterScene, SelectCharacterSceneName } from "../Login/SelectCharacterScene";
import { hasMovedEventName, Player, requestEmoteEventName } from "../Player/Player";
import { ErrorSceneName } from "../Reconnecting/ErrorScene";
import { ReconnectingSceneName } from "../Reconnecting/ReconnectingScene";
import { TextUtils } from "../Components/TextUtils";
import { joystickBaseImg, joystickBaseKey, joystickThumbImg, joystickThumbKey } from "../Components/MobileJoystick";
import { PropertyUtils } from "../Map/PropertyUtils";
import { analyticsClient } from "../../Administration/AnalyticsClient";
import { PathfindingManager } from "../../Utils/PathfindingManager";
import type {
    GroupCreatedUpdatedMessageInterface,
    MessageUserJoined,
    MessageUserMovedInterface,
    OnConnectInterface,
    PositionInterface,
    RoomJoinedMessageInterface,
} from "../../Connection/ConnexionModels";
import type { RoomConnection } from "../../Connection/RoomConnection";
import type { ActionableItem } from "../Items/ActionableItem";
import type { ItemFactoryInterface } from "../Items/ItemFactoryInterface";
import { biggestAvailableAreaStore } from "../../Stores/BiggestAvailableAreaStore";
import { playersStore } from "../../Stores/PlayersStore";
import { emoteStore } from "../../Stores/EmoteStore";
import {
    jitsiParticipantsCountStore,
    userIsAdminStore,
    userIsEditorStore,
    userIsJitsiDominantSpeakerStore,
} from "../../Stores/GameStore";
import {
    activeSubMenuStore,
    contactPageStore,
    inviteUserActivated,
    mapEditorActivated,
    mapManagerActivated,
    menuVisiblilityStore,
    roomListActivated,
    screenSharingActivatedStore,
    SubMenusInterface,
    subMenusStore,
} from "../../Stores/MenuStore";
import type { WasCameraUpdatedEvent } from "../../Api/Events/WasCameraUpdatedEvent";
import { audioManagerFileStore, bubbleSoundStore } from "../../Stores/AudioManagerStore";
import { currentPlayerGroupLockStateStore } from "../../Stores/CurrentPlayerGroupStore";
import { errorScreenStore } from "../../Stores/ErrorScreenStore";
import {
    availabilityStatusStore,
    batchGetUserMediaStore,
    lastNewMediaDeviceDetectedStore,
    localVoiceIndicatorStore,
    requestedCameraDeviceIdStore,
    requestedCameraState,
    requestedMicrophoneDeviceIdStore,
    requestedMicrophoneState,
    speakerSelectedStore,
} from "../../Stores/MediaStore";
import { LL, locale } from "../../../i18n/i18n-svelte";
import { GameSceneUserInputHandler } from "../UserInput/GameSceneUserInputHandler";
import { followUsersColorStore, followUsersStore } from "../../Stores/FollowStore";
import { axiosWithRetry, hideConnectionIssueMessage, showConnectionIssueMessage } from "../../Connection/AxiosUtils";
import { StringUtils } from "../../Utils/StringUtils";

import { SuperLoaderPlugin } from "../Services/SuperLoaderPlugin";
import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
import type { AddPlayerEvent } from "../../Api/Events/AddPlayerEvent";
import type { AskPositionEvent } from "../../Api/Events/AskPositionEvent";
import { chatVisibilityStore, forceRefreshChatStore } from "../../Stores/ChatStore";
import type { HasPlayerMovedInterface } from "../../Api/Events/HasPlayerMovedInterface";
import { extensionModuleStore, gameSceneIsLoadedStore, gameSceneStore } from "../../Stores/GameSceneStore";
import { myCameraBlockedStore, myMicrophoneBlockedStore } from "../../Stores/MyMediaStore";
import type { GameStateEvent } from "../../Api/Events/GameStateEvent";
import { currentPlayerWokaStore } from "../../Stores/CurrentPlayerWokaStore";
import {
    cameraResistanceModeStore,
    mapEditorModeStore,
    mapEditorRestrictedPropertiesStore,
    mapEditorSelectedToolStore,
    mapEditorWamSettingsEditorToolCurrentMenuItemStore,
    mapExplorationModeStore,
    WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM,
} from "../../Stores/MapEditorStore";
import { refreshPromptStore } from "../../Stores/RefreshPromptStore";
import { SpaceRegistry } from "../../Space/SpaceRegistry/SpaceRegistry";
import { SpaceScriptingBridgeService } from "../../Space/Utils/SpaceScriptingBridgeService";
import { debugAddPlayer, debugRemovePlayer, debugUpdatePlayer, debugZoom } from "../../Utils/Debuggers";
import { checkCoturnServer } from "../../Components/Video/utils";
import { BroadcastService } from "../../Streaming/BroadcastService";
import { megaphoneCanBeUsedStore, megaphoneSpaceStore } from "../../Stores/MegaphoneStore";
import { CompanionTextureError } from "../../Exception/CompanionTextureError";
import { SelectCompanionScene, SelectCompanionSceneName } from "../Login/SelectCompanionScene";
import { scriptUtils } from "../../Api/ScriptUtils";
import { hideBubbleConfirmationModal } from "../../Rules/StatusRules/statusChangerFunctions";
import { statusChanger } from "../../Components/ActionBar/AvailabilityStatus/statusChanger";
import { warningMessageStore } from "../../Stores/ErrorStore";
import { closeCoWebsite, getCoWebSite, openCoWebSite, openCoWebSiteWithoutSource } from "../../Chat/Utils";
import { navChat } from "../../Chat/Stores/ChatStore";
import { ProximityChatRoom } from "../../Chat/Connection/Proximity/ProximityChatRoom";
import { ProximitySpaceManager } from "../../WebRtc/ProximitySpaceManager";
import { SpaceRegistryInterface } from "../../Space/SpaceRegistry/SpaceRegistryInterface";
import { WorldUserProvider } from "../../Chat/UserProvider/WorldUserProvider";
import { ChatUserProvider } from "../../Chat/UserProvider/ChatUserProvider";
import { UserProviderMerger } from "../../Chat/UserProviderMerger/UserProviderMerger";
import { AdminUserProvider } from "../../Chat/UserProvider/AdminUserProvider";
import { ExtensionModuleStatusSynchronization } from "../../Rules/StatusRules/ExtensionModuleStatusSynchronization";
import { isActivatedStore as isCalendarActiveStore, calendarEventsStore } from "../../Stores/CalendarStore";
import { isActivatedStore as isTodoListActiveStore, todoListsStore } from "../../Stores/TodoListStore";
import { externalSvelteComponentService } from "../../Stores/Utils/externalSvelteComponentService";
import { ExtensionModule } from "../../ExternalModule/ExtensionModule";
import { SpaceInterface } from "../../Space/SpaceInterface";
import { UserProviderInterface } from "../../Chat/UserProvider/UserProviderInterface";
import { faviconManager } from "../../WebRtc/FaviconManager";
import { popupStore } from "../../Stores/PopupStore";
import PopUpRoomAccessDenied from "../../Components/PopUp/PopUpRoomAccessDenied.svelte";
import PopUpTriggerActionMessage from "../../Components/PopUp/PopUpTriggerActionMessage.svelte";
import PopUpMapEditorNotEnabled from "../../Components/PopUp/PopUpMapEditorNotEnabled.svelte";
import PopUpMapEditorShortcut from "../../Components/PopUp/PopUpMapEditorShortcut.svelte";
import { enableUserInputsStore } from "../../Stores/UserInputStore";
import { videoStreamElementsStore, videoStreamStore, screenShareStreamStore } from "../../Stores/PeerStore";
import { ChatConnectionInterface } from "../../Chat/Connection/ChatConnection";
import { selectedRoomStore } from "../../Chat/Stores/SelectRoomStore";
import { raceTimeout } from "../../Utils/PromiseUtils";
import { ConversationBubble } from "../Entity/ConversationBubble";
import { GameMapFrontWrapper } from "./GameMap/GameMapFrontWrapper";
import { gameManager } from "./GameManager";
import { EmoteManager } from "./EmoteManager";
import { OutlineManager } from "./UI/OutlineManager";
import { soundManager } from "./SoundManager";
import { SharedVariablesManager } from "./SharedVariablesManager";
import { EmbeddedWebsiteManager } from "./EmbeddedWebsiteManager";
import { DynamicAreaManager } from "./DynamicAreaManager";
import { PlayerMovement } from "./PlayerMovement";
import { PlayersPositionInterpolator } from "./PlayersPositionInterpolator";
import { DirtyScene } from "./DirtyScene";
import { StartPositionCalculator } from "./StartPositionCalculator";
import { GameMapPropertiesListener } from "./GameMapPropertiesListener";
import { ActivatablesManager } from "./ActivatablesManager";
import type { AddPlayerInterface } from "./AddPlayerInterface";
import type { CameraManagerEventCameraUpdateData } from "./CameraManager";
import { CameraManager, CameraManagerEvent } from "./CameraManager";
import { EditorToolName, MapEditorModeManager } from "./MapEditor/MapEditorModeManager";
import type { PlayerDetailsUpdate } from "./RemotePlayersRepository";
import { RemotePlayersRepository } from "./RemotePlayersRepository";
import { IframeEventDispatcher } from "./IframeEventDispatcher";
import { PlayerVariablesManager } from "./PlayerVariablesManager";
import { SayManager } from "./Say/SayManager";
import { EntitiesCollectionsManager } from "./MapEditor/EntitiesCollectionsManager";
import { DEPTH_BUBBLE_CHAT_SPRITE, DEPTH_WHITE_MASK } from "./DepthIndexes";
import { ScriptingEventsManager } from "./ScriptingEventsManager";
import { FollowManager } from "./FollowManager";
import { uiWebsiteManager } from "./UI/UIWebsiteManager";
import { ScriptingVideoManager } from "./ScriptingVideoManager";
import EVENT_TYPE = Phaser.Scenes.Events;
import Sprite = Phaser.GameObjects.Sprite;
import CanvasTexture = Phaser.Textures.CanvasTexture;
import DOMElement = Phaser.GameObjects.DOMElement;
import Tileset = Phaser.Tilemaps.Tileset;
import SpriteSheetFile = Phaser.Loader.FileTypes.SpriteSheetFile;
import FILE_LOAD_ERROR = Phaser.Loader.Events.FILE_LOAD_ERROR;
import Clamp = Phaser.Math.Clamp;

export interface GameSceneInitInterface {
    reconnecting: boolean;
    initPosition?: PositionInterface;
}

interface GroupCreatedUpdatedEventInterface {
    type: "GroupCreatedUpdatedEvent";
    event: GroupCreatedUpdatedMessageInterface;
}

interface DeleteGroupEventInterface {
    type: "DeleteGroupEvent";
    groupId: number;
}

interface GroupUsersUpdatedEventInterface {
    type: "GroupUsersUpdatedEvent";
    event: GroupUsersUpdateMessage;
}

const WORLD_SPACE_NAME = "allWorldUser";

export class GameScene extends DirtyScene {
    Terrains: Array<Phaser.Tilemaps.Tileset>;
    CurrentPlayer!: Player;
    MapPlayersByKey: MapStore<number, RemotePlayer> = new MapStore<number, RemotePlayer>();
    Map!: Phaser.Tilemaps.Tilemap;
    Objects!: Array<Phaser.Physics.Arcade.Sprite>;
    mapFile!: ITiledMap;
    wamFile!: WAMFileFormat;
    animatedTiles!: AnimatedTiles;
    groups: Map<number, ConversationBubble>;
    circleTexture!: CanvasTexture;
    circleRedTexture!: CanvasTexture;
    pendingEvents = new Queue<
        GroupCreatedUpdatedEventInterface | DeleteGroupEventInterface | GroupUsersUpdatedEventInterface
    >();
    public connection: RoomConnection | undefined;
    mapUrlFile!: string;
    wamUrlFile?: string;
    roomUrl: string;
    currentTick!: number;
    lastSentTick!: number; // The last tick at which a position was sent.
    lastMoveEventSent: HasPlayerMovedInterface = {
        direction: PositionMessage_Direction.DOWN,
        moving: false,
        x: -1000,
        y: -1000,
        oldX: -1000,
        oldY: -1000,
    };
    public userInputManager!: UserInputManager;
    public readonly superLoad: SuperLoaderPlugin;
    private initPosition?: PositionInterface;
    private playersPositionInterpolator = new PlayersPositionInterpolator();
    private connectionAnswerPromiseDeferred: Deferred<RoomJoinedMessageInterface>;
    // A promise that will resolve when the "create" method is called (signaling loading is ended)
    private createPromiseDeferred: Deferred<void>;
    // A promise that will resolve when the scene is ready to start (all assets have been loaded and the connection to the room is established)
    private sceneReadyToStartDeferred: Deferred<void> = new Deferred<void>();
    private iframeSubscriptionList!: Array<Subscription>;
    private gameMapChangedSubscription!: Subscription;
    private messageSubscription: Subscription | null = null;
    private rxJsSubscriptions: Array<Subscription> = [];
    private emoteUnsubscriber!: Unsubscriber;
    private localVolumeStoreUnsubscriber: Unsubscriber | undefined;
    private followUsersColorStoreUnsubscriber!: Unsubscriber;
    private userIsJitsiDominantSpeakerStoreUnsubscriber!: Unsubscriber;
    private jitsiParticipantsCountStoreUnsubscriber!: Unsubscriber;
    private highlightedEmbedScreenUnsubscriber!: Unsubscriber;
    private embedScreenLayoutStoreUnsubscriber!: Unsubscriber;
    private availabilityStatusStoreUnsubscriber!: Unsubscriber;
    private mapEditorModeStoreUnsubscriber!: Unsubscriber;
    private mapExplorationStoreUnsubscriber!: Unsubscriber;
    private modalVisibilityStoreUnsubscriber!: Unsubscriber;
    private cameraResistanceModeStoreUnsubscriber!: Unsubscriber;
    private lastNewMediaDeviceDetectedStoreUnsubscriber!: Unsubscriber;
    private peerStoreUnsubscriber!: Unsubscriber;
    private unsubscribers: Unsubscriber[] = [];
    private entityPermissions: EntityPermissions | undefined;
    private entityPermissionsDeferred: Deferred<EntityPermissions> = new Deferred();
    private gameMapFrontWrapper!: GameMapFrontWrapper;
    private actionableItems: Map<number, ActionableItem> = new Map<number, ActionableItem>();
    private isReconnecting: boolean | undefined = undefined;
    private playerName!: string;
    private popUpElements: Map<number, DOMElement> = new Map<number, Phaser.GameObjects.DOMElement>();
    private originalMapUrl: string | undefined;
    private pinchManager: PinchManager | undefined;
    private outlineManager!: OutlineManager;
    private mapTransitioning = false; //used to prevent transitions happening at the same time.
    private emoteManager!: EmoteManager;
    private cameraManager!: CameraManager;
    private mapEditorModeManager!: MapEditorModeManager;
    private entitiesCollectionsManager!: EntitiesCollectionsManager;
    private pathfindingManager!: PathfindingManager;
    private activatablesManager!: ActivatablesManager;
    private preloading = true;
    private startPositionCalculator!: StartPositionCalculator;
    private sharedVariablesManager!: SharedVariablesManager;
    private playerVariablesManager!: PlayerVariablesManager;
    private scriptingEventsManager!: ScriptingEventsManager;
    private followManager!: FollowManager;
    private hasMovedThisFrame: boolean = false;

    private proximitySpaceManager: ProximitySpaceManager | undefined;
    private scriptingVideoManager: ScriptingVideoManager | undefined;
    private objectsByType = new Map<string, ITiledMapObject[]>();
    private embeddedWebsiteManager!: EmbeddedWebsiteManager;
    private areaManager!: DynamicAreaManager;
    private _sayManager: SayManager | undefined;
    private loader: Loader;
    private lastCameraEvent: WasCameraUpdatedEvent | undefined;
    private firstCameraUpdateSent = false;
    private currentPlayerGroupId?: number;
    private showVoiceIndicatorChangeMessageSent = false;
    private jitsiDominantSpeaker = false;
    private jitsiParticipantsCount = 0;
    private cleanupDone = false;
    private playersEventDispatcher = new IframeEventDispatcher();
    private playersMovementEventDispatcher = new IframeEventDispatcher();
    private remotePlayersRepository = new RemotePlayersRepository();
    private throttledSendViewportToServer!: () => void;
    private playersDebugLogAlreadyDisplayed = false;
    private hideTimeout: ReturnType<typeof setTimeout> | undefined;
    // The promise that will resolve to the current player textures. This will be available only after connection is established.
    private currentPlayerTexturesResolve!: (value: string[]) => void;
    private currentPlayerTexturesReject!: (reason: unknown) => void;
    private currentPlayerTexturesPromise: CancelablePromise<string[]> = new CancelablePromise((resolve, reject) => {
        this.currentPlayerTexturesResolve = resolve;
        this.currentPlayerTexturesReject = reject;
    });
    private currentCompanionTextureResolve!: (value: string) => void;
    private currentCompanionTextureReject!: (reason: unknown) => void;
    private currentCompanionTexturePromise: CancelablePromise<string> = new CancelablePromise((resolve, reject) => {
        this.currentCompanionTextureResolve = resolve;
        this.currentCompanionTextureReject = reject;
    });
    private _spaceRegistry: SpaceRegistryInterface | undefined;
    private spaceScriptingBridgeService: SpaceScriptingBridgeService | undefined;
    private allUserSpace: SpaceInterface | undefined;
    private _proximityChatRoom: ProximityChatRoom | undefined;
    private _userProviderMergerDeferred: Deferred<UserProviderMerger> = new Deferred();
    private worldUserProvider: WorldUserProvider | undefined;
    public extensionModule: ExtensionModule | undefined = undefined;
    public landingAreas: AreaData[] = [];
    // Listeners for when the player finishes moving
    private onPlayerMovementEndedCallbacks: Array<(event: HasPlayerMovedInterface) => void> = [];

    public _chatConnection: ChatConnectionInterface | undefined;
    private _proximityChatRoomDeferred: Deferred<ProximityChatRoom> = new Deferred();

    // FIXME: we need to put a "unknown" instead of a "any" and validate the structure of the JSON we are receiving.

    constructor(private _room: Room, customKey?: string) {
        super({
            key: customKey ?? _room.key,
        });

        this.Terrains = [];
        this.groups = new Map<number, ConversationBubble>();

        // TODO: How to get mapUrl from WAM here?
        if (_room.mapUrl) {
            this.mapUrlFile = _room.mapUrl;
        } else if (_room.wamUrl) {
            this.wamUrlFile = _room.wamUrl;
        }
        this.roomUrl = _room.key;

        this.entitiesCollectionsManager = new EntitiesCollectionsManager();

        this.createPromiseDeferred = new Deferred<void>();
        this.connectionAnswerPromiseDeferred = new Deferred<RoomJoinedMessageInterface>();
        this.loader = new Loader(this);
        this.superLoad = new SuperLoaderPlugin(this);
    }

    private _broadcastService: BroadcastService | undefined;

    public get broadcastService(): BroadcastService {
        if (this._broadcastService === undefined) {
            throw new Error("BroadcastService not initialized yet.");
        }
        return this._broadcastService;
    }

    //hook preload scene
    preload(): void {
        //initialize frame event of scripting API
        this.listenToIframeEvents();

        this.load.image("iconTalk", "/resources/icons/icon_talking.png");
        this.load.image("iconSpeaker", "/resources/icons/icon_speaking.png");
        this.load.image("iconMegaphone", "/resources/icons/icon_megaphone.png");
        this.load.image("iconStatusIndicatorInside", "/resources/icons/icon_status_indicator_inside.png");
        this.load.image("iconStatusIndicatorOutline", "/resources/icons/icon_status_indicator_outline.png");

        this.load.image("iconFocus", "/resources/icons/icon_focus.png");
        this.load.image("iconLink", "/resources/icons/icon_link.png");
        this.load.image("iconListenerMegaphone", "/resources/icons/icon_listener.png");
        this.load.image("iconSpeakerMegaphone", "/resources/icons/icon_speaker.png");
        this.load.image("iconSilent", "/resources/icons/icon_silent.png");
        this.load.image("iconMeeting", "/resources/icons/icon_meeting.png");

        if (touchScreenManager.supportTouchScreen) {
            this.load.image(joystickBaseKey, joystickBaseImg);
            this.load.image(joystickThumbKey, joystickThumbImg);
        }
        // Load the selected bubble sound from bubbleSoundStore
        const selectedBubbleSound = get(bubbleSoundStore);
        this.load.audio(
            `audio-webrtc-in-${selectedBubbleSound}`,
            `/resources/objects/webrtc-in-${selectedBubbleSound}.mp3`
        );
        this.load.audio(
            `audio-webrtc-out-${selectedBubbleSound}`,
            `/resources/objects/webrtc-out-${selectedBubbleSound}.mp3`
        );
        this.load.audio("audio-report-message", "/resources/objects/report-message.mp3");
        this.load.audio("audio-megaphone", "/resources/objects/megaphone.mp3");
        this.load.audio("audio-cloud", "/resources/objects/cloud.mp3");
        this.load.audio("new-message", "/resources/objects/new-message.mp3");

        this.sound.pauseOnBlur = false;

        this.load.on(FILE_LOAD_ERROR, (file: { src: string }) => {
            // If we happen to be in HTTP and we are trying to load a URL in HTTPS only... (this happens only in dev environments)
            if (
                window.location.protocol === "http:" &&
                file.src === this.mapUrlFile &&
                file.src.startsWith("http:") &&
                this.originalMapUrl === undefined
            ) {
                this.originalMapUrl = this.mapUrlFile;
                this.mapUrlFile = this.mapUrlFile.replace("http://", "https://");
                this.load.tilemapTiledJSON(this.mapUrlFile, this.mapUrlFile);
                this.load.on(
                    "filecomplete-tilemapJSON-" + this.mapUrlFile,
                    (key: string, type: string, data: unknown) => {
                        this.onMapLoad(data).catch((e) => console.error(e));
                    }
                );
                return;
            }
            // 127.0.0.1, localhost and *.localhost are considered secure, even on HTTP.
            // So if we are in https, we can still try to load a HTTP local resource (can be useful for testing purposes)
            // See https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts#when_is_a_context_considered_secure
            const base = new URL(window.location.href);
            base.pathname = "";
            const url = new URL(file.src, base.toString());
            const host = url.host.split(":")[0];
            if (
                window.location.protocol === "https:" &&
                file.src === this.mapUrlFile &&
                (host === "127.0.0.1" || host === "localhost" || host.endsWith(".localhost")) &&
                this.originalMapUrl === undefined
            ) {
                this.originalMapUrl = this.mapUrlFile;
                this.mapUrlFile = this.mapUrlFile.replace("https://", "http://");
                this.load.tilemapTiledJSON(this.mapUrlFile, this.mapUrlFile);
                this.load.on(
                    "filecomplete-tilemapJSON-" + this.mapUrlFile,
                    (key: string, type: string, data: unknown) => {
                        this.onMapLoad(data).catch((e) => console.error(e));
                    }
                );
                // If the map has already been loaded as part of another GameScene, the "on load" event will not be triggered.
                // In this case, we check in the cache to see if the map is here and trigger the event manually.
                if (this.cache.tilemap.exists(this.mapUrlFile)) {
                    const data = this.cache.tilemap.get(this.mapUrlFile);
                    this.onMapLoad(data.data).catch((e) => console.error(e));
                }
                return;
            }

            //once preloading is over, we don't want loading errors to crash the game, so we need to disable this behavior after preloading.
            //if SpriteSheetFile (WOKA file) don't display error and give an access for user
            if (this.preloading && !(file instanceof SpriteSheetFile)) {
                //remove loader in progress
                this.handleErrorAndCleanup(
                    new Error('Cannot load "' + (file?.src ?? this.originalMapUrl) + '"'),
                    "NETWORK_ERROR",
                    "Network error",
                    "An error occurred while loading a resource"
                );
            }
        });

        this.load.scenePlugin("AnimatedTiles", AnimatedTiles, "animatedTiles", "animatedTiles");
        if (this.wamUrlFile) {
            const absoluteWamFileUrl = new URL(this.wamUrlFile, window.location.href).toString();

            this.superLoad.loadPromise(
                axiosWithRetry.get(absoluteWamFileUrl).then((response) => {
                    try {
                        const wamFileResult = WAMFileFormat.safeParse(wamFileMigration.migrate(response.data));
                        if (!wamFileResult.success) {
                            this.handleErrorAndCleanup(
                                wamFileResult.error,
                                "WAM_FORMAT_ERROR",
                                "Format error",
                                "Invalid format while loading a WAM file"
                            );
                            return;
                        }
                        this.wamFile = wamFileResult.data;
                        this.mapUrlFile = new URL(this.wamFile.mapUrl, absoluteWamFileUrl).toString();
                        this.doLoadTMJFile(this.mapUrlFile);
                        this.loadEntityCollections();
                    } catch (error) {
                        this.handleErrorAndCleanup(
                            error,
                            "WAM_FILE_LOAD_ISSUE",
                            "Error when loading WAM file",
                            "Unknown error while loading WAM file"
                        );
                        return;
                    }
                })
            );
        } else {
            this.doLoadTMJFile(this.mapUrlFile);
        }

        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.load as any).rexWebFont({
            custom: {
                families: ["Press Start 2P"],
                testString: "abcdefg",
            },
        });

        //this function must stay at the end of preload function
        this.loader.addLoader();
    }

    private handleErrorAndCleanup(
        error: Error | unknown,
        errorCode: string,
        errorTitle: string,
        errorSubtitle: string
    ) {
        console.error(error);

        // In case an error is already displayed, let's do nothing. We want the first error to be kept visible.
        if (get(errorScreenStore)) {
            return;
        }

        this.loader.removeLoader();
        errorScreenStore.setError(
            ErrorScreenMessage.fromPartial({
                type: "error",
                code: errorCode,
                title: errorTitle,
                subtitle: errorSubtitle,
                details: error instanceof Error ? error.message : "Unknown error",
            })
        );

        this.cleanupClosingScene();
        this.scene.stop(this.scene.key);
        this.scene.remove(this.scene.key);
    }

    public getCustomEntityCollectionUrl() {
        const mapStoragePath = `${PUBLIC_MAP_STORAGE_PREFIX}${ENTITIES_FOLDER_PATH_NO_PREFIX}/${ENTITY_COLLECTION_FILE}`;
        return new URL(mapStoragePath, this.wamUrlFile).toString();
    }

    //hook initialisation
    init(initData: GameSceneInitInterface) {
        if (initData.initPosition !== undefined) {
            this.initPosition = initData.initPosition; //todo: still used?
        }
        if (initData.initPosition !== undefined) {
            this.isReconnecting = initData.reconnecting;
        }
    }

    //hook create scene
    create(): void {
        this.input.topOnly = false;
        this.preloading = false;
        this.cleanupDone = false;

        this.bindSceneEventHandlers();

        this.trackDirtyAnims();

        this.outlineManager = new OutlineManager(this);
        gameManager.gameSceneIsCreated(this);
        urlManager.pushRoomIdToUrl(this._room);
        analyticsClient.enteredRoom(this._room.id, this._room.group);
        contactPageStore.set(this._room.contactPage);

        if (touchScreenManager.supportTouchScreen) {
            this.pinchManager = new PinchManager(this);
        }

        const playerName = gameManager.getPlayerName();
        if (!playerName) {
            throw new Error("playerName is not set");
        }
        this.playerName = playerName;

        this.Map = this.add.tilemap(this.mapUrlFile);
        const mapDirUrl = this.mapUrlFile.substring(0, this.mapUrlFile.lastIndexOf("/"));
        this.mapFile.tilesets.forEach((tileset: ITiledMapTileset) => {
            if ("source" in tileset) {
                throw new Error(
                    `Tilesets must be embedded in a map. The tileset "${tileset.source}" must be embedded in the Tiled map "${this.mapUrlFile}".`
                );
            }
            if (!("image" in tileset)) {
                throw new Error(
                    `Tilesets made of a collection of images are not supported in WorkAdventure in the Tiled map "${this.mapUrlFile}".`
                );
            }
            const tilesetImage = this.Map.addTilesetImage(
                tileset.name,
                `${mapDirUrl}/${tileset.image}`,
                tileset.tilewidth,
                tileset.tileheight,
                tileset.margin,
                tileset.spacing /*, tileset.firstgid*/
            );
            if (tilesetImage) {
                this.Terrains.push(tilesetImage);
            } else {
                console.warn(`Failed to add TilesetImage ${tileset.name}: ${`${mapDirUrl}/${tileset.image}`}`);
            }
        });

        this.throttledSendViewportToServer = throttle(200, () => {
            this.sendViewportToServer();
        });

        //permit to set bound collision
        this.physics.world.setBounds(0, 0, this.Map.widthInPixels, this.Map.heightInPixels);

        this.embeddedWebsiteManager = new EmbeddedWebsiteManager(this);

        //add layer on map
        this.gameMapFrontWrapper = new GameMapFrontWrapper(
            this,
            new GameMap(this.mapFile, this.wamFile),
            this.Map,
            this.Terrains
        );
        this.gameMapFrontWrapper.initialize().catch((e) => console.error(e));
        for (const layer of this.gameMapFrontWrapper.getFlatLayers()) {
            if (layer.type === "tilelayer") {
                const exitSceneUrl = this.getExitSceneUrl(layer);
                if (exitSceneUrl !== undefined) {
                    this.loadNextGame(
                        Room.getRoomPathFromExitSceneUrl(exitSceneUrl, window.location.toString(), this.mapUrlFile)
                    ).catch((e) => console.error(e));
                }
                const exitUrl = this.getExitUrl(layer);
                if (exitUrl !== undefined) {
                    this.loadNextGameFromExitUrl(exitUrl).catch((e) => console.error(e));
                }
            }
            if (layer.type === "objectgroup") {
                for (const object of layer.objects) {
                    if (object.text) {
                        TextUtils.createTextFromITiledMapObject(this, object);
                    }
                    if (object.class === "website") {
                        // Let's load iframes in the map
                        const url = PropertyUtils.mustFindStringProperty(
                            GameMapProperties.URL,
                            object.properties,
                            'in the "' + object.name + '" object of type "website"'
                        );
                        const allowApi = PropertyUtils.findBooleanProperty(
                            GameMapProperties.ALLOW_API,
                            object.properties
                        );
                        const policy = PropertyUtils.findStringProperty(GameMapProperties.POLICY, object.properties);

                        this.embeddedWebsiteManager.createEmbeddedWebsite(
                            object.name,
                            url,
                            object.x,
                            object.y,
                            object.width ?? 0,
                            object.height ?? 0,
                            object.visible,
                            allowApi ?? false,
                            policy ?? "",
                            "map",
                            1
                        );
                    }
                }
            }
        }

        this.gameMapFrontWrapper.getExitUrls().forEach((exitUrl) => {
            this.loadNextGameFromExitUrl(exitUrl).catch((e) => console.error(e));
        });

        // TODO: Dynamic areas should be exclusively managed on the front side
        this.areaManager = new DynamicAreaManager(this.gameMapFrontWrapper);

        this.startPositionCalculator = new StartPositionCalculator(
            this.gameMapFrontWrapper,
            this.mapFile,
            this.initPosition,
            urlManager.getStartPositionNameFromUrl()
        );

        //add entities
        this.Objects = new Array<Phaser.Physics.Arcade.Sprite>();

        //create input to move
        this.userInputManager = new UserInputManager(this, new GameSceneUserInputHandler(this));
        mediaManager.setUserInputManager(this.userInputManager);

        if (localUserStore.getFullscreen()) {
            document
                .querySelector("body")
                ?.requestFullscreen()
                .catch((e) => console.error(e));
        }

        this.pathfindingManager = new PathfindingManager(
            this.gameMapFrontWrapper.getCollisionGrid(),
            this.gameMapFrontWrapper.getTileDimensions()
        );

        this.subscribeToGameMapChanged();
        this.subscribeToEntitiesManagerObservables();

        //notify game manager can to create currentUser in map
        this.createCurrentPlayer();
        this.removeAllRemotePlayers(); //cleanup the list  of remote players in case the scene was rebooted

        this.tryMovePlayerWithMoveToParameter();

        this.cameraManager = new CameraManager(
            this,
            { width: this.Map.widthInPixels, height: this.Map.heightInPixels },
            waScaleManager
        );
        this.configureResistanceToZoomOut();

        this.cameraResistanceModeStoreUnsubscriber = cameraResistanceModeStore.subscribe((resistanceMode) => {
            switch (resistanceMode) {
                case "resist_zoom_in":
                    this.configureResistanceToZoomIn();
                    break;
                case "resist_zoom_out":
                    this.configureResistanceToZoomOut();
                    break;
                case "no_resistance":
                    this.disableCameraResistance();
                    break;
                default: {
                    const _exhaustiveCheck: never = resistanceMode;
                }
            }
        });

        this.activatablesManager = new ActivatablesManager(this.CurrentPlayer);

        biggestAvailableAreaStore.recompute();
        this.cameraManager.startFollowPlayer(this.CurrentPlayer);
        if (ENABLE_MAP_EDITOR) {
            this.mapEditorModeManager = new MapEditorModeManager(this);
        }

        this.animatedTiles.init(this.Map);

        // Phaser unsubscribes from the events when the scene is destroyed, so we don't need to unsubscribe here
        // eslint-disable-next-line listeners/no-missing-remove-event-listener,listeners/no-inline-function-event-listener
        this.events.on("tileanimationupdate", () => (this.dirty = true));
        if (localUserStore.getDisableAnimations()) {
            this.animatedTiles.pause();
        }

        // Let's pause the scene if the connection is not established yet
        if (!this._room.isDisconnected()) {
            if (this.isReconnecting) {
                setTimeout(() => {
                    if (this.connection === undefined) {
                        try {
                            this.hide();
                        } catch (err) {
                            console.error("Scene sleep error: ", err);
                        }
                        if (get(errorScreenStore)) {
                            // If an error message is already displayed, don't display the "connection lost" message.
                            console.error(
                                "Error message store already displayed for CONNECTION_LOST",
                                get(errorScreenStore)
                            );
                            return;
                        }
                        errorScreenStore.setError(
                            ErrorScreenMessage.fromPartial({
                                type: "reconnecting",
                                code: "CONNECTION_LOST",
                                title: get(LL).warning.connectionLostTitle(),
                                details: get(LL).warning.connectionLostSubtitle(),
                                image: this._room.errorSceneLogo,
                            })
                        );
                    }
                }, 0);
            } else if (this.connection === undefined) {
                // Let's wait 1 second before printing the "connecting" screen to avoid blinking
                this.hideTimeout = setTimeout(() => {
                    this.hideTimeout = undefined;
                    if (this.connection === undefined) {
                        try {
                            this.hide();
                        } catch (err) {
                            console.error("Scene sleep error: ", err);
                        }
                        if (get(errorScreenStore)) {
                            // If an error message is already displayed, don't display the "connection lost" message.
                            console.error(
                                "Error message store already displayed for CONNECTION_PENDING: ",
                                get(errorScreenStore)
                            );
                            return;
                        }
                        /*
                         * @fixme
                         * The error awaiting connection appears while the connection is in progress.
                         * In certain cases like the invalid character layer, the connection is close and this error is displayed after selecting Woka scene.
                         * TODO: create connection status with invalid layer case and not display this error.
                         **/
                        /*errorScreenStore.setError(
                            ErrorScreenMessage.fromPartial({
                                type: "reconnecting",
                                code: "CONNECTION_PENDING",
                                title: get(LL).warning.waitingConnectionTitle(),
                                details: get(LL).warning.waitingConnectionSubtitle(),
                            })
                        );*/
                    }
                }, 1000);
            }
        }

        this.createPromiseDeferred.resolve();
        // Now, let's load the script, if any
        const scripts = this.getScriptUrls(this.mapFile);
        const disableModuleMode = PropertyUtils.findBooleanProperty(
            GameMapProperties.SCRIPT_DISABLE_MODULE_SUPPORT,
            this.mapFile.properties
        );
        const scriptPromises = [];
        for (const script of scripts) {
            scriptPromises.push(iframeListener.registerScript(script, !disableModuleMode));
        }

        this.reposition();

        new GameMapPropertiesListener(this, this.gameMapFrontWrapper).register();

        if (!this._room.isDisconnected()) {
            try {
                this.hide();
            } catch (err) {
                console.error("Scene sleep error: ", err);
            }
            this.connect();
        }

        /*this.connectionAnswerPromiseDeferred.promise.then((connectionAnswer) => {
            console.warn("Connection established", connectionAnswer);
        });
        this.CurrentPlayer.getTextureLoadedPromise().then((textures) => {
            console.warn("Current player textures loaded", textures);
        });
        this.gameMapFrontWrapper.initializedPromise.then(() => {
            console.warn("GameMapFrontWrapper initialized");
        });
        Promise.all(scriptPromises).then(() => {
            console.warn("All scripts loaded");
        });*/

        Promise.all([
            this.connectionAnswerPromiseDeferred.promise as Promise<unknown>,
            ...scriptPromises,
            this.CurrentPlayer.getTextureLoadedPromise() as Promise<unknown>,
            this.gameMapFrontWrapper.initializedPromise.promise,
            // Wait at most 5 seconds for the chat connection to be established
            // If not, we can still proceed starting the scene without chat fully loaded
            raceTimeout(gameManager.getChatConnection(), 5_000),
        ])
            .then(() => {
                this.initUserPermissionsOnEntity();
                this.hide(false);
                gameSceneIsLoadedStore.set(true);
                this.sceneReadyToStartDeferred.resolve();
                this.initializeAreaManager();
            })
            .catch((e: unknown) => {
                console.error("Initialization failed", e);
                Sentry.captureException(e);
                errorScreenStore.setException(e);
            });

        gameManager
            .getChatConnection()
            .then(() => {
                const connection = this.connection;
                const chatId = localUserStore.getChatId();
                const email: string | null = localUserStore.getLocalUser()?.email || null;
                if (email && chatId && connection) {
                    connection.emitUpdateChatId(email, chatId);
                    connection.emitPlayerChatID(chatId);
                }
            })
            .catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });

        if (gameManager.currentStartedRoom.backgroundColor != undefined) {
            this.cameras.main.setBackgroundColor(gameManager.currentStartedRoom.backgroundColor);
        }
    }

    public getMapUrl(): string {
        if (!this.mapUrlFile) {
            throw new Error("Trying to access mapUrl before it was fetched");
        }
        return this.mapUrlFile;
    }

    public getEntityPermissions(): EntityPermissions {
        if (this.entityPermissions === undefined) {
            throw new Error("EntityPermissions not instantiated yet");
        }
        return this.entityPermissions;
    }

    public getEntityPermissionsPromise(): Promise<EntityPermissions> {
        return this.entityPermissionsDeferred.promise;
    }

    public async onMapExit(roomUrl: URL) {
        if (this.mapTransitioning) return;
        this.mapTransitioning = true;

        this.gameMapFrontWrapper.triggerExitCallbacks();

        let targetRoom: Room;
        try {
            targetRoom = await Room.createRoom(roomUrl);
        } catch (e /*: unknown*/) {
            console.error('Error while fetching new room "' + roomUrl.toString() + '"', e);

            //show information room access denied
            popupStore.addPopup(
                PopUpRoomAccessDenied,
                {
                    message: get(LL).warning.accessDenied.room(),
                    click: () => {
                        popupStore.removePopup("roomAccessDenied");
                    },
                    userInputManager: this.userInputManager,
                },
                "roomAccessDenied"
            );

            this.mapTransitioning = false;
            return;
        }

        urlManager.pushStartLayerNameToUrl(roomUrl.hash);

        if (!targetRoom.isEqual(this._room)) {
            if (this.scene.get(targetRoom.key) === null) {
                console.error("next room not loaded", targetRoom.key);
                // Try to load next game room from exit URL
                // The policy of room can to be updated during a session and not load before
                await this.loadNextGameFromExitUrl(targetRoom.key);
            }
            this.cleanupClosingScene();

            this.scene.stop();
            this.scene.start(targetRoom.key);
            this.scene.remove(this.scene.key);
            forceRefreshChatStore.forceRefresh();
        } else {
            //if the exit points to the current map, we simply teleport the user back to the startLayer
            this.startPositionCalculator.initStartXAndStartY(urlManager.getStartPositionNameFromUrl());
            this.CurrentPlayer.x = this.startPositionCalculator.startPosition.x;
            this.CurrentPlayer.y = this.startPositionCalculator.startPosition.y;
            this.CurrentPlayer.finishFollowingPath(true);
            // clear properties in case we are moved on the same layer / area in order to trigger them
            this.gameMapFrontWrapper.clearCurrentProperties();
            this.gameMapFrontWrapper.setPosition(this.CurrentPlayer.x, this.CurrentPlayer.y);

            // TODO: we should have a "teleport" parameter to explicitly say the user teleports and should not be moved in 200ms to the new place.
            this.handleCurrentPlayerHasMovedEvent({
                x: this.CurrentPlayer.x,
                y: this.CurrentPlayer.y,
                direction: this.CurrentPlayer.lastDirection,
                moving: false,
            });

            this.markDirty();
            setTimeout(() => (this.mapTransitioning = false), 500);
        }
    }

    public playSound(sound: string) {
        if (!statusChanger.allowNotificationSound()) return;
        this.sound.play(sound, {
            volume: 0.2,
        });
    }

    public cleanupClosingScene(): void {
        // make sure we restart own medias
        mediaManager.disableMyCamera();
        mediaManager.disableMyMicrophone();
        // stop playing audio, close any open website, stop any open Jitsi, unsubscribe
        coWebsiteManager.cleanup();
        // Stop the script, if any
        if (this.mapFile) {
            const scripts = this.getScriptUrls(this.mapFile);
            for (const script of scripts) {
                iframeListener.unregisterScript(script);
            }
        }

        iframeListener.cleanup();
        uiWebsiteManager.closeAll();
        followUsersStore.stopFollowing();

        audioManagerFileStore.unloadAudio();

        this.connection?.closeConnection();
        this.outlineManager?.clear();
        this.userInputManager?.destroy();
        this.pinchManager?.destroy();
        this.emoteManager?.destroy();
        this.cameraManager?.destroy();
        this.mapEditorModeManager?.destroy();
        this._broadcastService?.destroy().catch((e) => {
            console.error("Error while destroying broadcast service", e);
            Sentry.captureException(e);
        });
        this.proximitySpaceManager?.destroy();
        this._proximityChatRoom?.destroy();
        this.mapEditorModeStoreUnsubscriber?.();
        this.emoteUnsubscriber?.();
        this.followUsersColorStoreUnsubscriber?.();
        this.modalVisibilityStoreUnsubscriber?.();
        this.highlightedEmbedScreenUnsubscriber?.();
        this.embedScreenLayoutStoreUnsubscriber?.();
        this.userIsJitsiDominantSpeakerStoreUnsubscriber?.();
        this.jitsiParticipantsCountStoreUnsubscriber?.();
        this.availabilityStatusStoreUnsubscriber?.();
        this.mapExplorationStoreUnsubscriber?.();
        this.cameraResistanceModeStoreUnsubscriber?.();
        this.lastNewMediaDeviceDetectedStoreUnsubscriber?.();
        this.peerStoreUnsubscriber?.();
        for (const unsubscriber of this.unsubscribers) {
            unsubscriber();
        }
        this.unsubscribers = [];
        console.log("unregister answerer before ");
        iframeListener.unregisterAnswerer("getState");
        iframeListener.unregisterAnswerer("loadTileset");
        iframeListener.unregisterAnswerer("getMapData");
        iframeListener.unregisterAnswerer("getWamMapData");
        iframeListener.unregisterAnswerer("triggerActionMessage");
        iframeListener.unregisterAnswerer("triggerPlayerMessage");
        iframeListener.unregisterAnswerer("removeActionMessage");
        iframeListener.unregisterAnswerer("removePlayerMessage");
        iframeListener.unregisterAnswerer("openCoWebsite");
        iframeListener.unregisterAnswerer("getCoWebsites");
        iframeListener.unregisterAnswerer("closeCoWebsite");
        iframeListener.unregisterAnswerer("closeCoWebsites");
        iframeListener.unregisterAnswerer("setPlayerOutline");
        iframeListener.unregisterAnswerer("removePlayerOutline");
        iframeListener.unregisterAnswerer("setVariable");
        iframeListener.unregisterAnswerer("openUIWebsite");
        iframeListener.unregisterAnswerer("getUIWebsites");
        iframeListener.unregisterAnswerer("getUIWebsiteById");
        iframeListener.unregisterAnswerer("closeUIWebsite");
        iframeListener.unregisterAnswerer("enablePlayersTracking");
        iframeListener.unregisterAnswerer("getPlayerPosition");
        iframeListener.unregisterAnswerer("movePlayerTo");
        iframeListener.unregisterAnswerer("teleportPlayerTo");
        iframeListener.unregisterAnswerer("getWoka");
        iframeListener.unregisterAnswerer("goToLogin");
        iframeListener.unregisterAnswerer("playSoundInBubble");
        console.log("unregister answerer after ");
        this.sharedVariablesManager?.close();
        this.playerVariablesManager?.close();
        this.scriptingEventsManager?.close();
        this.embeddedWebsiteManager?.close();
        this.scriptingVideoManager?.close();
        this.areaManager?.close();
        this._sayManager?.close();
        this.playersEventDispatcher.cleanup();
        this.playersMovementEventDispatcher.cleanup();
        this.gameMapFrontWrapper?.close();
        this.followManager?.close();
        this.spaceScriptingBridgeService?.destroy();

        this._spaceRegistry?.destroy().catch((e) => {
            console.error("Error while destroying space registry", e);
            Sentry.captureException(e);
        });

        // We need to destroy all the entities
        get(extensionModuleStore).forEach((extensionModule) => {
            extensionModule.destroy();
        });
        extensionModuleStore.set([]);

        //When we leave game, the camera is stop to be reopen after.
        // I think that we could keep camera status and the scene can manage camera setup
        //TODO find wy chrome don't manage correctly a multiple ask mediaDevices
        //mediaManager.hideMyCamera();

        for (const iframeEvents of this.iframeSubscriptionList) {
            iframeEvents.unsubscribe();
        }
        for (const subscription of this.rxJsSubscriptions) {
            subscription.unsubscribe();
        }
        this.rxJsSubscriptions = [];
        this.gameMapChangedSubscription?.unsubscribe();
        this.messageSubscription?.unsubscribe();
        gameSceneIsLoadedStore.set(false);
        gameSceneStore.set(undefined);
        this.cleanupDone = true;
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = undefined;
        }
    }

    /**
     * @param time
     * @param delta The delta time in ms since the last frame. This is a smoothed and capped value based on the FPS rate.
     */
    public update(time: number, delta: number): void {
        this.dirty = false;
        this.currentTick = time;

        this.CurrentPlayer.moveUser(delta, this.userInputManager.getEventListForGameTick());
        if (this.mapEditorModeManager?.isActive()) {
            this.mapEditorModeManager.update(time, delta);
        }

        for (const addedPlayer of this.remotePlayersRepository.getAddedPlayers()) {
            debugAddPlayer("Player will be add to the GameScene", addedPlayer);
            this.doAddPlayer(addedPlayer);
            debugAddPlayer("Player has been added to the GameScene", addedPlayer);
        }
        for (const movedPlayer of this.remotePlayersRepository.getMovedPlayers()) {
            this.doUpdatePlayerPosition(movedPlayer);
        }
        for (const updatedPlayer of this.remotePlayersRepository.getUpdatedPlayers()) {
            debugUpdatePlayer("Player will be update from GameScene", updatedPlayer);
            this.doUpdatePlayerDetails(updatedPlayer);
            debugUpdatePlayer("Player has been updated from GameScene", updatedPlayer);
        }
        for (const removedPlayerId of this.remotePlayersRepository.getRemovedPlayers()) {
            debugRemovePlayer("Player will be remove from GameScene", removedPlayerId);
            this.doRemovePlayer(removedPlayerId);
            debugRemovePlayer("Player has been removed from GameScene", removedPlayerId);
        }

        if (
            !this.playersDebugLogAlreadyDisplayed &&
            this.remotePlayersRepository.getPlayers().size !== this.MapPlayersByKey.size
        ) {
            console.error(
                "Not the same count of players",
                this.remotePlayersRepository.getPlayers(),
                this.MapPlayersByKey,
                "Added players:",
                this.remotePlayersRepository.getAddedPlayers(),
                "Moved players:",
                this.remotePlayersRepository.getMovedPlayers(),
                "Updated players:",
                this.remotePlayersRepository.getUpdatedPlayers(),
                "Removed players:",
                this.remotePlayersRepository.getRemovedPlayers()
            );
            this.playersDebugLogAlreadyDisplayed = true;
        }

        this.remotePlayersRepository.reset();

        // Let's handle all events
        while (this.pendingEvents.length !== 0) {
            this.dirty = true;
            const event = this.pendingEvents.dequeue();
            switch (event.type) {
                /*case "AddPlayerEvent":
                    this.doAddPlayer(event.event);
                    break;
                case "RemovePlayerEvent":
                    this.doRemovePlayer(event.userId);
                    break;
                case "UserMovedEvent": {
                    this.doUpdatePlayerPosition(event.event);
                    const remotePlayer = this.MapPlayersByKey.get(event.event.userId);
                    if (remotePlayer) {
                        this.activatablesManager.updateDistanceForSingleActivatableObject(remotePlayer);
                        this.activatablesManager.deduceSelectedActivatableObjectByDistance();
                    }
                    break;
                }*/
                case "GroupCreatedUpdatedEvent":
                    this.doShareGroupPosition(event.event);
                    break;
                /*case "PlayerDetailsUpdated":
                    this.doUpdatePlayerDetails(event.details);
                    break;*/
                case "DeleteGroupEvent": {
                    this.doDeleteGroup(event.groupId);
                    if (this.currentPlayerGroupId === event.groupId) {
                        currentPlayerGroupLockStateStore.set(undefined);
                    }
                    break;
                }
                case "GroupUsersUpdatedEvent": {
                    this.doUpdateGroupUsers(event.event.groupId, event.event.userIds);
                    break;
                }
                default: {
                    const _exhaustiveCheck: never = event;
                }
            }
        }
        // Let's move all users
        const updatedPlayersPositions = this.playersPositionInterpolator.getUpdatedPositions(time);
        updatedPlayersPositions.forEach((moveEvent: HasPlayerMovedInterface, userId: number) => {
            this.dirty = true;
            const player: RemotePlayer | undefined = this.MapPlayersByKey.get(userId);
            if (player === undefined) {
                throw new Error('Cannot find player with ID "' + userId + '"');
            }
            player.updatePosition(moveEvent);
        });
        // If any of the users (including me) has moved, we need to recompute the shape of all bubbles
        for (const group of this.groups.values()) {
            if (updatedPlayersPositions.size > 0 || this.hasMovedThisFrame || group.isAnimating) {
                group.step();
            }
        }
        this.hasMovedThisFrame = false;
    }

    deleteGroup(groupId: number): void {
        this.pendingEvents.enqueue({
            type: "DeleteGroupEvent",
            groupId,
        });
    }

    doDeleteGroup(groupId: number): void {
        const group = this.groups.get(groupId);
        if (!group) {
            return;
        }
        group.destroy();
        this.groups.delete(groupId);
    }

    doUpdateGroupUsers(groupId: number, userIds: number[]): void {
        const group = this.groups.get(groupId);
        if (!group) {
            console.warn("Could not find group with ID", groupId);
            return;
        }
        group.updateUsers(userIds);
    }

    doUpdatePlayerDetails(update: PlayerDetailsUpdate): void {
        const character = this.MapPlayersByKey.get(update.player.userId);
        if (character === undefined) {
            console.info(
                "Could not set new details to character with ID ",
                update.player.userId,
                ". Did he/she left before te message was received?"
            );
            return;
        }

        if (update.updated.availabilityStatus) {
            character.setAvailabilityStatus(update.player.availabilityStatus);
        }
        if (update.updated.outlineColor) {
            if (update.player.outlineColor === undefined) {
                character.removeApiOutlineColor();
            } else {
                character.setApiOutlineColor(update.player.outlineColor);
            }
        }
        if (update.updated.showVoiceIndicator) {
            character.toggleTalk(update.player.showVoiceIndicator);
        }
        if (update.updated.sayMessage) {
            character.say(update.player.sayMessage?.message ?? "", update.player.sayMessage?.type ?? 0);
        }
    }

    /**
     * Sends to the server an event emitted by one of the ActionableItems.
     */
    emitActionableEvent(itemId: number, eventName: string, state: unknown, parameters: unknown) {
        this.connection?.emitActionableEvent(itemId, eventName, state, parameters);
    }

    public onResize(): void {
        super.onResize();
        this.reposition(true);

        this.throttledSendViewportToServer();
    }

    public sendViewportToServer(margin = 300): void {
        const camera = this.cameras.main;
        if (!camera) {
            return;
        }
        this.connection?.setViewport({
            left: Math.max(0, camera.scrollX - margin),
            top: Math.max(0, camera.scrollY - margin),
            right: camera.scrollX + camera.width + margin,
            bottom: camera.scrollY + camera.height + margin,
        });
    }

    public reposition(instant = false): void {
        // Recompute camera offset if needed
        this.time.delayedCall(0, () => {
            biggestAvailableAreaStore.recompute();
            if (this.cameraManager != undefined) {
                this.cameraManager.updateCameraOffset(get(biggestAvailableAreaStore), instant);
            }
        });
    }

    public createSuccessorGameScene(autostart: boolean, reconnecting: boolean) {
        const gameSceneKey = "somekey" + Math.round(Math.random() * 10000);
        const game = new GameScene(this._room, gameSceneKey);
        this.scene.add(gameSceneKey, game, autostart, {
            initPosition: {
                x: this.CurrentPlayer.x,
                y: this.CurrentPlayer.y,
            },
            reconnecting: reconnecting,
        });

        //If new gameScene doesn't start automatically then we change the gameScene in gameManager so that it can start the new gameScene
        if (!autostart) {
            gameManager.gameSceneIsCreated(game);
        }
        this.scene.stop(this.scene.key);
        this.scene.remove(this.scene.key);
    }

    public getGameMap(): GameMap {
        return this.gameMapFrontWrapper.getGameMap();
    }

    public getGameMapFrontWrapper(): GameMapFrontWrapper {
        return this.gameMapFrontWrapper;
    }

    public getCameraManager(): CameraManager {
        return this.cameraManager;
    }

    public getRemotePlayersRepository(): RemotePlayersRepository {
        return this.remotePlayersRepository;
    }

    public getMapEditorModeManager(): MapEditorModeManager {
        return this.mapEditorModeManager;
    }

    public getEntitiesCollectionsManager(): EntitiesCollectionsManager {
        return this.entitiesCollectionsManager;
    }

    public getPathfindingManager(): PathfindingManager {
        return this.pathfindingManager;
    }

    public getActivatablesManager(): ActivatablesManager {
        return this.activatablesManager;
    }

    public getOutlineManager(): OutlineManager {
        return this.outlineManager;
    }

    /**
     * Quickfix for phaser last version breaking the outline on
     * objects and characters
     * TODO: Remove this function after the bug correction on phaser
     */
    public refreshSceneForOutline(): void {
        this.events.once(Phaser.Scenes.Events.POST_UPDATE, () => {
            this.markDirty();
        });
        this.markDirty();
    }

    private loadEntityCollections() {
        const customEntityCollectionUrl = this.getCustomEntityCollectionUrl();
        const collectionDescriptors: { url: string; type: EntityPrefabType }[] = this.wamFile.entityCollections.map(
            (collectionUrl) => ({
                url: collectionUrl.url,
                type: "Default",
            })
        );
        collectionDescriptors.push({ url: customEntityCollectionUrl, type: "Custom" });

        this.entitiesCollectionsManager.loadCollections(collectionDescriptors);
    }

    private doLoadTMJFile(mapUrlFile: string): void {
        this.load.on("filecomplete-tilemapJSON-" + mapUrlFile, (key: string, type: string, data: unknown) => {
            this.onMapLoad(data).catch((e) => console.error(e));
        });
        this.load.tilemapTiledJSON(mapUrlFile, mapUrlFile);
        // If the map has already been loaded as part of another GameScene, the "on load" event will not be triggered.
        // In this case, we check in the cache to see if the map is here and trigger the event manually.
        if (this.cache.tilemap.exists(mapUrlFile)) {
            const data = this.cache.tilemap.get(mapUrlFile);
            this.onMapLoad(data.data).catch((e) => console.error(e));
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async onMapLoad(data: any): Promise<void> {
        // Triggered when the map is loaded
        // Load tiles attached to the map recursively
        // The map file can be modified by the scripting API and we don't want to tamper the Phaser cache (in case we come back on the map after visiting other maps)
        // So we are doing a deep copy
        this.mapFile = structuredClone(data);

        // Safe parse can take up to 600ms on a 17MB map.
        // TODO: move safeParse to a "map" page and display details of what is going wrong there.
        /*const parseResult = ITiledMap.safeParse(this.mapFile);
        if (!parseResult.success) {
            console.warn("Your map file seems to be invalid. Errors: ", parseResult.error);
        }*/

        const url = this.mapUrlFile.substring(0, this.mapUrlFile.lastIndexOf("/"));
        this.mapFile.tilesets.forEach((tileset) => {
            if ("source" in tileset) {
                throw new Error(
                    `Tilesets must be embedded in a map. The tileset "${tileset.source}" must be embedded in the Tiled map "${this.mapUrlFile}".`
                );
            }
            if (typeof tileset.name === "undefined" || !("image" in tileset)) {
                console.warn("Don't know how to handle tileset ", tileset);
                return;
            }
            //TODO strategy to add access token
            if (tileset.image.includes(".svg")) {
                this.load.svg(`${url}/${tileset.image}`, `${url}/${tileset.image}`, {
                    width: tileset.imagewidth,
                    height: tileset.imageheight,
                });
            } else {
                this.load.image(`${url}/${tileset.image}`, `${url}/${tileset.image}`);
            }
        });

        // Scan the object layers for objects to load and load them.
        this.objectsByType = new Map<string, ITiledMapObject[]>();

        for (const layer of this.mapFile.layers) {
            if (layer.type === "objectgroup") {
                for (const object of layer.objects) {
                    let objectsOfType: ITiledMapObject[] | undefined;
                    if (object.class) {
                        if (!this.objectsByType.has(object.class)) {
                            objectsOfType = new Array<ITiledMapObject>();
                        } else {
                            objectsOfType = this.objectsByType.get(object.class);
                            if (objectsOfType === undefined) {
                                throw new Error("Unexpected object type not found");
                            }
                        }
                        objectsOfType.push(object);
                        this.objectsByType.set(object.class, objectsOfType);
                    }
                }
            }
        }

        // TODO: remove support for these objects. They have been superseded by variables and scripting and entities for a long time.
        for (const [itemType, objectsOfType] of this.objectsByType) {
            // FIXME: we would ideally need for the loader to WAIT for the import to be performed, which means writing our own loader plugin.

            let itemFactory: ItemFactoryInterface;

            switch (itemType) {
                case "computer": {
                    //eslint-disable-next-line no-await-in-loop
                    const module = await import("../Items/Computer/computer");
                    itemFactory = module.default;
                    break;
                }
                default:
                    continue;
                //throw new Error('Unsupported object type: "'+ itemType +'"');
            }

            itemFactory.preload(this.load);
            this.load.start(); // Let's manually start the loader because the import might be over AFTER the loading ends.

            // Note: the code below is probably wrong, but not used anymore.
            // eslint-disable-next-line listeners/no-missing-remove-event-listener,listeners/no-inline-function-event-listener
            this.load.on("complete", () => {
                // FIXME: the factory might fail because the resources might not be loaded yet...
                // We would need to add a loader ended event in addition to the createPromise
                this.createPromiseDeferred.promise
                    .then(async () => {
                        itemFactory.create(this);

                        const roomJoinedAnswer = await this.connectionAnswerPromiseDeferred.promise;

                        for (const object of objectsOfType) {
                            // TODO: we should pass here a factory to create sprites (maybe?)

                            // Do we have a state for this object?
                            const state = roomJoinedAnswer.items[object.id];

                            const actionableItem = itemFactory.factory(this, object, state);
                            this.actionableItems.set(actionableItem.getId(), actionableItem);
                        }
                    })
                    .catch((e) => console.error(e));
            });
        }
    }

    private initUserPermissionsOnEntity() {
        if (!this.connection) {
            throw new Error("This should never happen");
        }
        const userCanEdit = this.connection.userCanEdit;
        const gameMapAreas = this.getGameMap().getGameMapAreas();
        if (gameMapAreas !== undefined) {
            this.entityPermissions = new EntityPermissions(
                gameMapAreas,
                this.connection.getAllTags() ?? [],
                userCanEdit,
                localUserStore.getLocalUser()?.uuid
            );
            this.entityPermissionsDeferred.resolve(this.entityPermissions);
        }
    }

    private initializeAreaManager() {
        if (!this.connection) {
            throw new Error("This should never happen");
        }
        const userCanEdit = this.connection.userCanEdit;
        const userConnectedTags = this.connection.getAllTags() ?? [];
        this.gameMapFrontWrapper.initializeAreaManager(userConnectedTags, userCanEdit);
    }

    private hide(hide = true): void {
        this.scene.setVisible(!hide);
        iframeListener?.hideIFrames(hide);
    }

    /**
     * Initializes the connection to Pusher.
     */
    private connect(): void {
        const camera = this.cameraManager.getCamera();

        connectionManager
            .connectToRoomSocket(
                this.roomUrl,
                this.playerName,
                gameManager.getCharacterTextureIds() ?? [],
                {
                    ...this.startPositionCalculator.startPosition,
                },
                {
                    left: camera.scrollX,
                    top: camera.scrollY,
                    right: camera.scrollX + camera.width,
                    bottom: camera.scrollY + camera.height,
                },
                gameManager.getCompanionTextureId(),
                get(availabilityStatusStore),
                this.getGameMap().getLastCommandId()
            )
            .then(async (onConnect: OnConnectInterface) => {
                this.connection = onConnect.connection;
                this.mapEditorModeManager?.subscribeToRoomConnection(this.connection);
                const commandsToApply = onConnect.room.commandsToApply;
                if (commandsToApply) {
                    try {
                        await this.mapEditorModeManager?.updateMapToNewest(commandsToApply);
                    } catch (e) {
                        Sentry.captureException(e);
                        console.error("Error while updating map to newest", e);
                    }
                }

                const _spaceRegistry = new SpaceRegistry(this.connection);
                this._spaceRegistry = _spaceRegistry;
                this.spaceScriptingBridgeService = new SpaceScriptingBridgeService(this._spaceRegistry);

                videoStreamStore.set(this._spaceRegistry.videoStreamStore);
                screenShareStreamStore.set(this._spaceRegistry.screenShareStreamStore);
                this._spaceRegistry
                    .joinSpace(WORLD_SPACE_NAME, FilterType.ALL_USERS, ["availabilityStatus", "chatID"])
                    .then((space) => {
                        this.allUserSpace = space;
                        this.worldUserProvider = new WorldUserProvider(space);

                        return gameManager.getChatConnection();
                    })
                    .then((chatConnection) => {
                        this._chatConnection = chatConnection;
                        const connection = this.connection;
                        const allUserSpace = this.allUserSpace;

                        const userProviders: UserProviderInterface[] = [];

                        if (ENABLE_CHAT_DISCONNECTED_LIST && this._room.isChatDisconnectedListEnabled) {
                            if (connection) {
                                userProviders.push(new AdminUserProvider(connection));
                            }
                            userProviders.push(new ChatUserProvider(chatConnection));
                        }

                        if (allUserSpace && this._room.isChatOnlineListEnabled && this.worldUserProvider) {
                            userProviders.push(this.worldUserProvider);
                        }

                        this._userProviderMergerDeferred.resolve(new UserProviderMerger(userProviders));
                    })
                    .catch((e) => {
                        const errorMessage = "Failed to get chatConnection from gameManager : " + e;
                        console.error(errorMessage);
                        Sentry.captureMessage(e);
                    });

                this.initExtensionModule();

                this.tryOpenMapEditorWithToolEditorParameter();

                this.subscribeToStores();

                lazyLoadPlayerCharacterTextures(this.superLoad, onConnect.room.characterTextures)
                    .then((textures) => {
                        this.currentPlayerTexturesResolve(textures);
                    })
                    .catch((e) => {
                        this.currentPlayerTexturesReject(e);
                    });

                if (onConnect.room.companionTexture) {
                    lazyLoadPlayerCompanionTexture(this.superLoad, onConnect.room.companionTexture)
                        .then((texture) => {
                            this.currentCompanionTextureResolve(texture);
                        })
                        .catch((e) => {
                            this.currentCompanionTextureReject(e);
                        });
                }

                playersStore.connectToRoomConnection(this.connection);
                userIsAdminStore.set(this.connection.hasTag("admin"));
                userIsEditorStore.set(this.connection.hasTag("editor"));

                // The userJoinedMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.userJoinedMessageStream.subscribe((message) => {
                    this.remotePlayersRepository.addPlayer(message);

                    this.playersEventDispatcher.postMessage({
                        type: "addRemotePlayer",
                        data: {
                            playerId: message.userId,
                            name: message.name,
                            userUuid: message.userUuid,
                            outlineColor: message.outlineColor,
                            availabilityStatus: availabilityStatusToJSON(message.availabilityStatus),
                            position: message.position,
                            variables: message.variables,
                            chatID: message.chatID,
                        },
                    });
                });

                // The userMovedMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.userMovedMessageStream.subscribe((message) => {
                    this.remotePlayersRepository.movePlayer(message);
                    const position = message.position;
                    if (position === undefined) {
                        throw new Error("Position missing from UserMovedMessage");
                    }

                    const messageUserMoved: MessageUserMovedInterface = {
                        userId: message.userId,
                        position: position,
                    };

                    this.updatePlayerPosition(messageUserMoved);
                });

                // The userLeftMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.userLeftMessageStream.subscribe((message) => {
                    this.remotePlayersRepository.removePlayer(message.userId);
                    this.playersEventDispatcher.postMessage({
                        type: "removeRemotePlayer",
                        data: message.userId,
                    });
                });

                // The refreshRoomMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.refreshRoomMessageStream.subscribe((message) => {
                    refreshPromptStore.set({
                        timeToRefresh: message.timeToRefresh,
                    });
                });

                // The playerDetailsUpdatedMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.playerDetailsUpdatedMessageStream.subscribe((message) => {
                    // Is this message for me (exceptionally, we can use this stream to send messages to users
                    // who share the same UUID as us)
                    if (message.userId === this.connection?.getUserId() && message.details?.setVariable) {
                        this.playerVariablesManager.updateVariable(message.details?.setVariable);
                        return;
                    }

                    this.remotePlayersRepository.updatePlayer(message);
                });

                // The groupUpdateMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.groupUpdateMessageStream.subscribe(
                    (groupPositionMessage: GroupCreatedUpdatedMessageInterface) => {
                        this.shareGroupPosition(groupPositionMessage);
                    }
                );

                // The groupDeleteMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.groupDeleteMessageStream.subscribe((message) => {
                    try {
                        this.deleteGroup(message.groupId);
                    } catch (e) {
                        console.error(e);
                    }
                });

                // The serverDisconnected stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.serverDisconnected.subscribe(() => {
                    showConnectionIssueMessage();
                    console.info("Player disconnected from server. Reloading scene.");
                    this.cleanupClosingScene();

                    console.log("createSuccessorGameScene in finally");
                    this.createSuccessorGameScene(true, true);
                });
                hideConnectionIssueMessage();

                // The itemEventMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.itemEventMessageStream.subscribe((message) => {
                    const item = this.actionableItems.get(message.itemId);
                    if (item === undefined) {
                        console.warn(
                            'Received an event about object "' +
                                message.itemId +
                                '" but cannot find this item on the map.'
                        );
                        return;
                    }
                    item.fire(message.event, message.state, message.parameters);
                });

                // The groupUsersUpdateMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.groupUsersUpdateMessageStream.subscribe((message) => {
                    const userId = this.connection?.getUserId();
                    if (userId && message.userIds.includes(userId)) {
                        this.currentPlayerGroupId = message.groupId;
                    }

                    this.pendingEvents.enqueue({
                        type: "GroupUsersUpdatedEvent",
                        event: message,
                    });
                });

                // The joinMucRoomMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.joinMucRoomMessageStream.subscribe((mucRoomDefinitionMessage) => {
                    void iframeListener.sendJoinMucEventToChatIframe(
                        mucRoomDefinitionMessage.url,
                        mucRoomDefinitionMessage.name,
                        mucRoomDefinitionMessage.type,
                        mucRoomDefinitionMessage.subscribe
                    );
                });

                // The leaveMucRoomMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.leaveMucRoomMessageStream.subscribe((leaveMucRoomMessage) => {
                    void iframeListener.sendLeaveMucEventToChatIframe(leaveMucRoomMessage.url);
                });

                // The worldFullMessageStream stream is completed in the RoomConnection. No need to unsubscribe.

                this.messageSubscription = this.connection.worldFullMessageStream.subscribe((message) => {
                    this.showWorldFullError(message);
                });

                batchGetUserMediaStore.startBatch();
                mediaManager.enableMyCamera();
                mediaManager.enableMyMicrophone();
                batchGetUserMediaStore.commitChanges();

                // Set up manager of audio streams received by the scripting API (useful for bots)

                this._proximityChatRoom = new ProximityChatRoom(
                    this.connection.getSpaceUserId(),
                    this._spaceRegistry,
                    iframeListener
                );

                this._proximityChatRoomDeferred.resolve(this._proximityChatRoom);
                this.proximitySpaceManager = new ProximitySpaceManager(this.connection, this._proximityChatRoom);

                this.scriptingVideoManager = new ScriptingVideoManager();

                this._sayManager = new SayManager(this.connection, this.CurrentPlayer);

                userMessageManager.setReceiveBanListener(this.bannedUser.bind(this));

                this.CurrentPlayer.on(hasMovedEventName, (event: HasPlayerMovedInterface) => {
                    this.handleCurrentPlayerHasMovedEvent(event);
                });

                // Set up events manager
                this.scriptingEventsManager = new ScriptingEventsManager(this.connection);

                // Set up follow manager
                this.followManager = new FollowManager(this.connection, this.remotePlayersRepository);

                // Set up variables manager
                this.sharedVariablesManager = new SharedVariablesManager(
                    this.connection,
                    this.gameMapFrontWrapper,
                    onConnect.room.variables
                );
                const playerVariables: Map<string, unknown> = onConnect.room.playerVariables;
                // If the user is not logged, we initialize the variables with variables from the local storage
                if (!localUserStore.isLogged()) {
                    if (this._room.group) {
                        for (const [key, { isPublic, value }] of localUserStore
                            .getAllUserProperties(this._room.group)
                            .entries()) {
                            if (isPublic) {
                                this.connection?.emitPlayerSetVariable({
                                    key,
                                    value,
                                    persist: false,
                                    public: true,
                                    scope: "world",
                                });
                            }
                            playerVariables.set(key, value);
                        }
                    }

                    for (const [key, { isPublic, value }] of localUserStore
                        .getAllUserProperties(this._room.id)
                        .entries()) {
                        if (isPublic) {
                            this.connection?.emitPlayerSetVariable({
                                key,
                                value,
                                persist: false,
                                public: true,
                                scope: "room",
                            });
                        }
                        playerVariables.set(key, value);
                    }
                }
                this.playerVariablesManager = new PlayerVariablesManager(
                    this.connection,
                    this.playersEventDispatcher,
                    playerVariables,
                    this._room.id,
                    this._room.group ?? undefined
                );

                const broadcastService = new BroadcastService(this._spaceRegistry);
                this._broadcastService = broadcastService;

                // The megaphoneSettingsMessageStream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.megaphoneSettingsMessageStream.subscribe((megaphoneSettingsMessage) => {
                    if (megaphoneSettingsMessage) {
                        megaphoneCanBeUsedStore.set(megaphoneSettingsMessage.enabled);
                        if (
                            megaphoneSettingsMessage.url &&
                            get(availabilityStatusStore) !== AvailabilityStatus.DO_NOT_DISTURB
                        ) {
                            const oldMegaphoneSpace = get(megaphoneSpaceStore);
                            const spaceName = slugify(megaphoneSettingsMessage.url);

                            // Early return if no space registry available
                            if (!this._spaceRegistry) {
                                console.warn("No space registry available for megaphone space management");
                                return;
                            }

                            // Handle existing megaphone space
                            if (oldMegaphoneSpace) {
                                if (oldMegaphoneSpace.getName() === spaceName) {
                                    return;
                                }
                                // Different space, leave the old one
                                this._spaceRegistry.leaveSpace(oldMegaphoneSpace).catch((e) => {
                                    console.error("Error while leaving space", e);
                                    Sentry.captureException(e);
                                });
                            }

                            broadcastService
                                .joinSpace(spaceName)
                                .then((space) => {
                                    megaphoneSpaceStore.set(space);
                                })
                                .catch((e) => {
                                    console.error(e);
                                    Sentry.captureException(e);
                                });
                        }
                    }
                });
                this._broadcastService = broadcastService;

                // The errorMessageStream is completed in the RoomConnection. No need to unsubscribe.
                //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
                this.connection.errorMessageStream.subscribe((errorMessage) => {
                    warningMessageStore.addWarningMessage(errorMessage.message);
                });

                this.connectionAnswerPromiseDeferred.resolve(onConnect.room);
                // Analyze tags to find if we are admin. If yes, show console.

                const error = get(errorScreenStore);
                if (error && error?.type === "reconnecting") errorScreenStore.delete();
                //this.scene.stop(ReconnectingSceneName);

                this.landingAreas =
                    this.getGameMap().getGameMapAreas()?.getAreasOnPosition({
                        x: this.CurrentPlayer.x,
                        y: this.CurrentPlayer.y,
                    }) || [];

                this.gameMapFrontWrapper.setPosition(this.CurrentPlayer.x, this.CurrentPlayer.y);
                // Init layer change listener
                this.gameMapFrontWrapper.onEnterLayer((layers) => {
                    layers.forEach((layer) => {
                        iframeListener.sendEnterLayerEvent(layer.name);
                    });
                });

                this.gameMapFrontWrapper.onLeaveLayer((layers) => {
                    layers.forEach((layer) => {
                        iframeListener.sendLeaveLayerEvent(layer.name);
                    });
                });

                // NOTE: Leaving events names as "enterArea" and "leaveArea" to not introduce any breaking changes.
                //       We are only looking through dynamic areas when handling those events.
                this.gameMapFrontWrapper.onEnterDynamicArea((areas) => {
                    areas.forEach((area) => {
                        iframeListener.sendEnterAreaEvent(area.name);
                    });
                });

                this.gameMapFrontWrapper.onLeaveDynamicArea((areas) => {
                    areas.forEach((area) => {
                        iframeListener.sendLeaveAreaEvent(area.name);
                    });
                });

                this.gameMapFrontWrapper.onEnterDynamicArea((areas) => {
                    areas.forEach((area) => {
                        iframeListener.sendEnterMapEditorAreaEvent(area.name);
                    });
                });

                this.gameMapFrontWrapper.onLeaveDynamicArea((areas) => {
                    areas.forEach((area) => {
                        iframeListener.sendLeaveMapEditorAreaEvent(area.name);
                    });
                });

                this.emoteManager = new EmoteManager(this, this.connection);

                // Check WebRtc connection
                if (onConnect.room.webRtcUserName && onConnect.room.webRtcPassword) {
                    try {
                        checkCoturnServer({
                            userId: onConnect.connection.getSpaceUserId(),
                            webRtcUser: onConnect.room.webRtcUserName,
                            webRtcPassword: onConnect.room.webRtcPassword,
                        });
                    } catch (err) {
                        console.error("Check coturn server exception: ", err);
                    }
                }

                // Get position from UUID only after the connection to the pusher is established
                this.tryMovePlayerWithMoveToUserParameter();

                gameSceneStore.set(this);
            })
            .catch((e) => console.error(e));
    }

    private initExtensionModule() {
        if (this._room.modules) {
            const externalModules = import.meta.glob("../../external-modules/*/index.ts");

            for (const moduleName of this._room.modules) {
                const moduleFactory = externalModules[`../../external-modules/${moduleName}/index.ts`];

                if (!moduleFactory) {
                    console.warn(`Unable to find module "${moduleName}" inside external modules`);
                    return;
                }
                (async () => {
                    const extensionModule = (await moduleFactory()) as { default: ExtensionModule };
                    const defaultExtensionModule = extensionModule.default;
                    // Check if the module is already initialized
                    if (get(extensionModuleStore).find((module) => module.id === defaultExtensionModule.id)) {
                        return;
                    }

                    const connection = this.connection;
                    if (!connection) {
                        throw new Error("Connection is undefined");
                    }

                    const authToken = localUserStore.getAuthToken();
                    if (!authToken) {
                        throw new Error("Auth token is undefined");
                    }

                    defaultExtensionModule.init(this._room.metadata, {
                        workadventureStatusStore: availabilityStatusStore,
                        userAccessToken: authToken,
                        roomId: this.roomUrl,
                        externalModuleMessage: connection.externalModuleMessage,
                        onExtensionModuleStatusChange: ExtensionModuleStatusSynchronization.onStatusChange,
                        calendarEventsStoreUpdate: calendarEventsStore.update,
                        todoListStoreUpdate: todoListsStore.update,
                        openCoWebSite: openCoWebSiteWithoutSource,
                        closeCoWebsite,
                        getOauthRefreshToken: connection.getOauthRefreshToken.bind(this.connection),
                        adminUrl: ADMIN_URL,
                        externalSvelteComponent: externalSvelteComponentService,
                        spaceRegistry: this._spaceRegistry,
                        logoutCallback: () => {
                            connectionManager.logout();
                        },
                        externalRestrictedMapEditorProperties: mapEditorRestrictedPropertiesStore,
                        showComponentInChat(component: ComponentType, props: Record<string, unknown>) {
                            navChat.switchToCustomComponent(component, props);
                            chatVisibilityStore.set(true);
                        },
                        openErrorScreen: (error: Error) => {
                            errorScreenStore.setException(error);
                            gameManager.closeGameScene();
                        },
                        onPlayerMovementEnded: this.onPlayerMovementEnded.bind(this),
                    });

                    if (defaultExtensionModule.calendarSynchronised) isCalendarActiveStore.set(true);
                    if (defaultExtensionModule.todoListSynchronized) isTodoListActiveStore.set(true);
                    extensionModuleStore.add(defaultExtensionModule);
                    console.info(`Extension module ${moduleName} initialization finished`);
                })().catch((error) => console.error(error));
            }
        }
    }

    private subscribeToStores(): void {
        if (
            this.userIsJitsiDominantSpeakerStoreUnsubscriber != undefined ||
            this.jitsiParticipantsCountStoreUnsubscriber != undefined ||
            this.availabilityStatusStoreUnsubscriber != undefined ||
            this.emoteUnsubscriber != undefined ||
            this.followUsersColorStoreUnsubscriber != undefined ||
            this.mapEditorModeStoreUnsubscriber != undefined ||
            this.mapExplorationStoreUnsubscriber != undefined ||
            this.lastNewMediaDeviceDetectedStoreUnsubscriber != undefined
        ) {
            console.error(
                "subscribeToStores => Check all subscriber undefined ",
                this.userIsJitsiDominantSpeakerStoreUnsubscriber,
                this.jitsiParticipantsCountStoreUnsubscriber,
                this.availabilityStatusStoreUnsubscriber,
                this.emoteUnsubscriber,
                this.followUsersColorStoreUnsubscriber,
                this.mapEditorModeStoreUnsubscriber,
                this.mapExplorationStoreUnsubscriber,
                this.lastNewMediaDeviceDetectedStoreUnsubscriber
            );

            throw new Error("One store is already subscribed.");
        }

        this.userIsJitsiDominantSpeakerStoreUnsubscriber = userIsJitsiDominantSpeakerStore.subscribe(
            (dominantSpeaker) => {
                this.jitsiDominantSpeaker = dominantSpeaker;
                this.tryChangeShowVoiceIndicatorState(this.jitsiDominantSpeaker && this.jitsiParticipantsCount > 1);
            }
        );

        this.jitsiParticipantsCountStoreUnsubscriber = jitsiParticipantsCountStore.subscribe((participantsCount) => {
            this.jitsiParticipantsCount = participantsCount;
            this.tryChangeShowVoiceIndicatorState(this.jitsiDominantSpeaker && this.jitsiParticipantsCount > 1);
        });

        this.availabilityStatusStoreUnsubscriber = availabilityStatusStore.subscribe((availabilityStatus) => {
            if (!this.connection) {
                throw new Error("Connection is undefined");
            }
            this.connection.emitPlayerStatusChange(availabilityStatus);
            this.CurrentPlayer.setAvailabilityStatus(availabilityStatus);
            if (availabilityStatus === AvailabilityStatus.SILENT) {
                this.CurrentPlayer.toggleTalk(false, true);
            }
        });

        this.emoteUnsubscriber = emoteStore.subscribe((emote) => {
            if (emote && get(enableUserInputsStore)) {
                this.CurrentPlayer?.playEmote(emote.emoji);
                this.connection?.emitEmoteEvent(emote.emoji);
                emoteStore.set(null);
            }
        });

        this.followUsersColorStoreUnsubscriber = followUsersColorStore.subscribe((color) => {
            if (color !== undefined) {
                this.CurrentPlayer.setFollowOutlineColor(color);
                this.connection?.emitPlayerOutlineColor(color);
            } else {
                this.CurrentPlayer.removeFollowOutlineColor();
                this.connection?.emitPlayerOutlineColor(null);
            }
        });

        this.highlightedEmbedScreenUnsubscriber = highlightedEmbedScreen.subscribe((value) => {
            //this.reposition();
        });

        this.embedScreenLayoutStoreUnsubscriber = embedScreenLayoutStore.subscribe((layout) => {
            //this.reposition();
        });

        let oldPeersNumber = 0;
        let oldUsers = new Map<number, MessageUserJoined>();
        let screenWakeRelease: (() => Promise<void>) | undefined;
        let alreadyInBubble = false;
        const pendingConnects = new Set<number>();
        this.peerStoreUnsubscriber = videoStreamElementsStore.subscribe((peers) => {
            const newPeerNumber = peers.length;
            const newUsers = new Map<number, MessageUserJoined>();
            const players = this.remotePlayersRepository.getPlayers();

            for (const playerId of peers.keys()) {
                const currentPlayer = players.get(playerId);
                if (currentPlayer) {
                    newUsers.set(playerId, currentPlayer);
                }
            }

            // Join
            if (oldPeersNumber === 0 && newPeerNumber > oldPeersNumber) {
                // Note: by design, the peerStore can only add or remove one user at a given time.
                // So we know for sure that there is only one new user.
                const peer = Array.from(peers.values())[0];
                //askIfUserWantToJoinBubbleOf(peer.userName);

                statusChanger.setUserNameInteraction(peer.player?.name ?? "unknow");

                statusChanger.applyInteractionRules();

                pendingConnects.add(peer.userId);
                setTimeout(() => {
                    // In case the peer never connects, we should remove it from the pendingConnects after a timeout
                    pendingConnects.delete(peer.userId);
                    /*if (pendingConnects.size === 0 && !alreadyInBubble && !this.cleanupDone) {
                    iframeListener.sendJoinProximityMeetingEvent(Array.from(newUsers.values()));
                    alreadyInBubble = true;
                    }*/
                }, 5000);

                peer.once("connect", () => {
                    pendingConnects.delete(peer.userId);
                    if (pendingConnects.size === 0) {
                        iframeListener.sendJoinProximityMeetingEvent(Array.from(newUsers.values()));
                        alreadyInBubble = true;
                    }
                });
            }

            // Left
            if (newPeerNumber === 0 && newPeerNumber < oldPeersNumber) {
                // TODO: leave event can be triggered without a join if connect fails
                hideBubbleConfirmationModal();
                iframeListener.sendLeaveProximityMeetingEvent();

                if (screenWakeRelease) {
                    screenWakeRelease()
                        .then(() => {
                            screenWakeRelease = undefined;
                        })
                        .catch((error) => console.error(error));
                }
            }

            // Participant Join
            if (oldPeersNumber > 0 && oldPeersNumber < newPeerNumber) {
                const newUser = Array.from(newUsers.values()).find((player) => !oldUsers.get(player.userId));

                if (newUser) {
                    if (alreadyInBubble) {
                        const peer = peers.find((p) => p.userId === newUser.userId);
                        peer?.once("connect", () => {
                            iframeListener.sendParticipantJoinProximityMeetingEvent(newUser);
                        });
                    } else {
                        const peer = peers.find((p) => p.userId === newUser.userId);
                        pendingConnects.add(newUser.userId);
                        setTimeout(() => {
                            // In case the peer never connects, we should remove it from the pendingConnects after a timeout
                            pendingConnects.delete(newUser.userId);
                            /*if (pendingConnects.size === 0 && !alreadyInBubble && !this.cleanupDone) {
                                iframeListener.sendJoinProximityMeetingEvent(Array.from(newUsers.values()));
                                alreadyInBubble = true;
                            }*/
                        }, 5000);
                        peer?.once("connect", () => {
                            pendingConnects.delete(newUser.userId);
                            if (pendingConnects.size === 0) {
                                iframeListener.sendJoinProximityMeetingEvent(Array.from(newUsers.values()));
                                alreadyInBubble = true;
                            }
                        });
                    }
                }
            }

            // Participant Left
            if (newPeerNumber > 0 && newPeerNumber < oldPeersNumber) {
                const oldUser = Array.from(oldUsers.values()).find((player) => !newUsers.get(player.userId));

                if (oldUser) {
                    // TODO: leave event can be triggered without a join if connect fails
                    iframeListener.sendParticipantLeaveProximityMeetingEvent(oldUser);
                }
            }

            if (newPeerNumber > oldPeersNumber) {
                const bubbleSound = get(bubbleSoundStore);
                this.playSound(`audio-webrtc-in-${bubbleSound}`);
                faviconManager.pushNotificationFavicon();
            } else if (newPeerNumber < oldPeersNumber) {
                const bubbleSound = get(bubbleSoundStore);
                this.playSound(`audio-webrtc-out-${bubbleSound}`);
                faviconManager.pushOriginalFavicon();
            }

            if (newPeerNumber > 0) {
                if (!this.localVolumeStoreUnsubscriber) {
                    this.localVolumeStoreUnsubscriber = localVoiceIndicatorStore.subscribe((isTalking) => {
                        this.tryChangeShowVoiceIndicatorState(isTalking);

                        return () => {
                            this.tryChangeShowVoiceIndicatorState(false);
                        };
                    });
                }
                //this.reposition();
            } else {
                this.CurrentPlayer.toggleTalk(false, true);
                this.connection?.emitPlayerShowVoiceIndicator(false);
                this.showVoiceIndicatorChangeMessageSent = false;
                //this.MapPlayersByKey.forEach((remotePlayer) => remotePlayer.toggleTalk(false, true));
                if (this.localVolumeStoreUnsubscriber) {
                    this.localVolumeStoreUnsubscriber();
                    this.localVolumeStoreUnsubscriber = undefined;
                }

                //this.reposition();
            }

            oldUsers = newUsers;
            oldPeersNumber = newPeerNumber;
        });

        this.mapEditorModeStoreUnsubscriber = mapEditorModeStore.subscribe((isOn) => {
            if (isOn) {
                this.activatablesManager.deactivateSelectedObject();
                this.activatablesManager.handlePointerOutActivatableObject();
                this.activatablesManager.disableSelectingByDistance();
            } else {
                this.activatablesManager.handlePointerOutActivatableObject();
                this.activatablesManager.enableSelectingByDistance();
                // make sure all entities are non-interactive
                this.gameMapFrontWrapper.getEntitiesManager().makeAllEntitiesNonInteractive();
                // add interactions back only for activatables
                this.gameMapFrontWrapper.getEntitiesManager().makeAllEntitiesInteractive(true);
            }
            this.markDirty();
        });

        this.mapExplorationStoreUnsubscriber = mapExplorationModeStore.subscribe((exploration) => {
            if (exploration) {
                this.cameraManager.setExplorationMode();
            } else {
                this.input.keyboard?.enableGlobalCapture();
            }
        });

        this.lastNewMediaDeviceDetectedStoreUnsubscriber = lastNewMediaDeviceDetectedStore.subscribe((devices) => {
            if (devices.length === 0) return;
            // filter device by name tu avoid multiple notification for the same device
            const devicesToNotify = devices.reduce((devices: MediaDeviceInfo[], currentDevice: MediaDeviceInfo) => {
                if (
                    devices.find((device_) => device_.label == currentDevice.label) != undefined ||
                    get(requestedCameraDeviceIdStore) == currentDevice.deviceId ||
                    get(requestedMicrophoneDeviceIdStore) == currentDevice.deviceId ||
                    get(speakerSelectedStore) == currentDevice.deviceId
                )
                    return devices;

                devices.push(currentDevice);
                return devices;
            }, []);

            for (const device of devicesToNotify) {
                const id = `playtext-mediadevice-${device.deviceId}`;
                this.CurrentPlayer.destroyText(id);
                this.CurrentPlayer.playText(
                    id,
                    get(LL).camera.webrtc.newDeviceDetected({ device: device.label }),
                    5000,
                    () => {
                        this.CurrentPlayer.destroyText(id);

                        // get all devices with the same label
                        const devicesToUse = devices.filter((device_) => device_.label === device.label);

                        for (const deviceToUse of devicesToUse) {
                            switch (deviceToUse.kind) {
                                case "videoinput":
                                    requestedCameraDeviceIdStore.set(deviceToUse.deviceId);
                                    localUserStore.setPreferredVideoInputDevice(deviceToUse.deviceId);
                                    break;
                                // use the new device
                                case "audioinput":
                                    requestedMicrophoneDeviceIdStore.set(deviceToUse.deviceId);
                                    localUserStore.setPreferredAudioInputDevice(deviceToUse.deviceId);
                                    break;

                                case "audiooutput":
                                    localUserStore.setSpeakerDeviceId(deviceToUse.deviceId);
                                    speakerSelectedStore.set(deviceToUse.deviceId);
                                    break;
                                default:
                                    console.warn("Unknown device kind: ", deviceToUse.kind);
                            }
                        }
                    },
                    true,
                    "message"
                );
            }
        });

        // Subscribe to bubble sound changes
        this.unsubscribers.push(
            bubbleSoundStore.subscribe((soundType) => {
                this.load.audio(`audio-webrtc-in-${soundType}`, `/resources/objects/webrtc-in-${soundType}.mp3`);
                this.load.audio(`audio-webrtc-out-${soundType}`, `/resources/objects/webrtc-out-${soundType}.mp3`);
                this.load.start();
            })
        );
    }

    private listenToIframeEvents(): void {
        this.iframeSubscriptionList = [];
        this.iframeSubscriptionList.push(
            iframeListener.openPopupStream.subscribe((openPopupEvent) => {
                let objectLayerSquare: ITiledMapObject;
                const targetObjectData = this.gameMapFrontWrapper.findObject(openPopupEvent.targetObject);
                if (targetObjectData !== undefined) {
                    objectLayerSquare = targetObjectData;
                } else {
                    console.error(
                        "Error while opening a popup. Cannot find an object on the map with name '" +
                            openPopupEvent.targetObject +
                            "'. The first parameter of WA.openPopup() must be the name of a rectangle object in your map."
                    );
                    return;
                }
                const escapedMessage = HtmlUtils.escapeHtml(openPopupEvent.message);
                let html =
                    '<div id="container" class="relative bg-contrast/80 backdrop-blur pt-4 overflow-hidden rounded-lg text-white" hidden>';
                if (escapedMessage) {
                    html += `<div class="text-xxs text-center px-2">
${escapedMessage}
 </div> `;
                }

                const buttonContainer =
                    '<div class="buttonContainer flex flex-wrap gap-2 bg-contrast py-2 px-2 mt-2"</div>';
                html += buttonContainer;
                let id = 0;
                for (const button of openPopupEvent.buttons) {
                    html += `<div class="flex w-full"><button type="button" class="btn btn-xs hover:bg-contrast-600/50 justify-center w-full pb-4 ${HtmlUtils.escapeHtml(
                        button.className ?? ""
                    )}" id="popup-${openPopupEvent.popupId}-${id}">${HtmlUtils.escapeHtml(button.label)}</button>`;
                    id++;
                }
                html += "</div></div>";
                const domElement = this.add.dom(objectLayerSquare.x, objectLayerSquare.y).createFromHTML(html);

                const container = z.instanceof(HTMLDivElement).parse(domElement.getChildByID("container"));
                container.style.width = objectLayerSquare.width + "px";
                domElement.scale = 0;
                domElement.setClassName("popUpElement");

                setTimeout(() => {
                    container.hidden = false;
                }, 100);

                id = 0;
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                for (const button of openPopupEvent.buttons) {
                    const button = HtmlUtils.getElementByIdOrFail<HTMLButtonElement>(
                        `popup-${openPopupEvent.popupId}-${id}`
                    );
                    const btnId = id;
                    button.onclick = () => {
                        iframeListener.sendButtonClickedEvent(openPopupEvent.popupId, btnId);
                        // Disable for a short amount of time to let time to the script to remove the popup
                        button.disabled = true;
                        setTimeout(() => {
                            button.disabled = false;
                        }, 100);
                    };
                    id++;
                }
                this.tweens.add({
                    targets: domElement,
                    scale: 1,
                    ease: "EaseOut",
                    duration: 400,
                });

                this.popUpElements.set(openPopupEvent.popupId, domElement);

                // Analytics tracking for popups
                analyticsClient.openedPopup(openPopupEvent.targetObject, openPopupEvent.popupId);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.closePopupStream.subscribe((closePopupEvent) => {
                const popUpElement = this.popUpElements.get(closePopupEvent.popupId);
                if (popUpElement === undefined) {
                    console.error(
                        "Could not close popup with ID ",
                        closePopupEvent.popupId,
                        ". Maybe it has already been closed?"
                    );
                }

                this.tweens.add({
                    targets: popUpElement,
                    scale: 0,
                    ease: "EaseOut",
                    duration: 400,
                    onComplete: () => {
                        popUpElement?.destroy();
                        this.popUpElements.delete(closePopupEvent.popupId);
                    },
                });
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.openChatStream.subscribe(() => {
                chatVisibilityStore.set(true);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.closeChatStream.subscribe(() => {
                chatVisibilityStore.set(false);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.turnOffMicrophoneStream.subscribe(() => {
                requestedMicrophoneState.disableMicrophone();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.turnOffWebcamStream.subscribe(() => {
                requestedCameraState.disableWebcam();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.disableMicrophoneStream.subscribe(() => {
                myMicrophoneBlockedStore.set(true);
                mediaManager.disableMyMicrophone();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.restoreMicrophoneStream.subscribe(() => {
                myMicrophoneBlockedStore.set(false);
                mediaManager.enableMyMicrophone();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.disableWebcamStream.subscribe(() => {
                myCameraBlockedStore.set(true);
                mediaManager.disableMyCamera();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.restoreWebcamStream.subscribe(() => {
                myCameraBlockedStore.set(false);
                mediaManager.enableMyCamera();
            })
        );

        this.iframeSubscriptionList.push(
            // FIXME: aren't we making a weird loop here?
            iframeListener.addPersonnalMessageStream.subscribe((text) => {
                iframeListener.sendUserInputChat(text, undefined);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.chatMessageStream.subscribe((chatMessage) => {
                this.proximityChatRoomPromise()
                    .then((room) => {
                        switch (chatMessage.options.scope) {
                            case "local": {
                                room.addExternalMessage("local", chatMessage.message, chatMessage.options.author);
                                selectedRoomStore.set(room);
                                chatVisibilityStore.set(true);

                                break;
                            }
                            case "bubble": {
                                room.addExternalMessage("bubble", chatMessage.message);
                                selectedRoomStore.set(room);
                                chatVisibilityStore.set(true);
                            }
                        }
                    })
                    .catch((error) => {
                        console.error("Error while sending proximity chat message", error);
                        Sentry.captureException(error);
                    });
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.startTypingProximityMessageStream.subscribe((sartWriting) => {
                this.proximityChatRoomPromise()
                    .then((room) => {
                        room.addExternalTypingUser(
                            btoa(sartWriting.author ?? "unknow"),
                            sartWriting.author ?? "unknow",
                            null
                        );
                    })
                    .catch((error) => {
                        console.error("Error while starting typing proximity message", error);
                        Sentry.captureException(error);
                    });
            })
        );
        this.iframeSubscriptionList.push(
            iframeListener.stopTypingProximityMessageStream.subscribe((stopWriting) => {
                this.proximityChatRoomPromise()
                    .then((room) => {
                        room.removeExternalTypingUser(btoa(stopWriting.author ?? "unknow"));
                    })
                    .catch((error) => {
                        console.error("Error while stopping typing proximity message", error);
                        Sentry.captureException(error);
                    });
            })
        );

        /*this.iframeSubscriptionList.push(
            iframeListener.newChatMessageWritingStatusStream.subscribe((status) => {
                // TODO: Implement
                console.debug("Not implemented yet with new chat integration", status);
            })
        );*/

        this.iframeSubscriptionList.push(
            iframeListener.disablePlayerControlStream.subscribe((messageEventSource) => {
                if (messageEventSource) {
                    this.userInputManager.disableControls(messageEventSource);

                    iframeListener.onIframeCloseEvent(messageEventSource, () => {
                        this.userInputManager.restoreControls(messageEventSource);
                    });
                }
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.enablePlayerControlStream.subscribe((messageEventSource) => {
                if (messageEventSource) {
                    this.userInputManager.restoreControls(messageEventSource);
                }
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.disablePlayerProximityMeetingStream.subscribe(() => {
                mediaManager.disableProximityMeeting();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.enablePlayerProximityMeetingStream.subscribe(() => {
                mediaManager.enableProximityMeeting();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.cameraSetStream.subscribe((cameraSetEvent) => {
                const duration = cameraSetEvent.smooth ? cameraSetEvent.duration ?? 1000 : 0;
                if (cameraSetEvent.lock) {
                    this.cameraManager.enterFocusMode({ ...cameraSetEvent }, undefined, duration);
                } else {
                    this.cameraManager.setPosition({ ...cameraSetEvent }, duration);
                }
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.cameraFollowPlayerStream.subscribe((cameraFollowPlayerEvent) => {
                const duration = cameraFollowPlayerEvent.smooth ? cameraFollowPlayerEvent.duration ?? 1000 : 0;
                this.cameraManager.leaveFocusMode(this.CurrentPlayer, duration);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.playSoundStream.subscribe((playSoundEvent) => {
                const url = new URL(playSoundEvent.url, this.mapUrlFile);
                soundManager
                    .playSound(this.load, this.sound, url.toString(), playSoundEvent.config)
                    .catch((e) => console.error(e));
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.stopSoundStream.subscribe((stopSoundEvent) => {
                const url = new URL(stopSoundEvent.url, this.mapUrlFile);
                soundManager.stopSound(this.sound, url.toString());
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.askPositionStream.subscribe((event: AskPositionEvent) => {
                this.connection?.emitAskPosition(event.uuid, event.playUri);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.openInviteMenuStream.subscribe(() => {
                const inviteMenu = subMenusStore.findByKey(SubMenusInterface.invite);
                if (get(menuVisiblilityStore) && activeSubMenuStore.isActive(inviteMenu)) {
                    menuVisiblilityStore.set(false);
                    activeSubMenuStore.activateByIndex(0);
                    return;
                }
                activeSubMenuStore.activateByMenuItem(inviteMenu);
                menuVisiblilityStore.set(true);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.addActionsMenuKeyToRemotePlayerStream.subscribe((data) => {
                this.MapPlayersByKey.get(data.id)?.registerWokaMenuAction({
                    actionName: data.actionKey,
                    callback: () => {
                        iframeListener.sendActionsMenuActionClickedEvent({ actionName: data.actionKey, id: data.id });
                    },
                });
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.removeActionsMenuKeyFromRemotePlayerEvent.subscribe((data) => {
                this.MapPlayersByKey.get(data.id)?.unregisterWokaMenuAction(data.actionKey);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.trackCameraUpdateStream.subscribe(() => {
                if (!this.firstCameraUpdateSent) {
                    this.cameraManager.on(
                        CameraManagerEvent.CameraUpdate,
                        (data: CameraManagerEventCameraUpdateData) => {
                            const cameraEvent: WasCameraUpdatedEvent = {
                                x: data.x,
                                y: data.y,
                                width: data.width,
                                height: data.height,
                                zoom: data.zoom,
                            };
                            if (
                                this.lastCameraEvent?.x == cameraEvent.x &&
                                this.lastCameraEvent?.y == cameraEvent.y &&
                                this.lastCameraEvent?.width == cameraEvent.width &&
                                this.lastCameraEvent?.height == cameraEvent.height &&
                                this.lastCameraEvent?.zoom == cameraEvent.zoom
                            ) {
                                return;
                            }

                            this.lastCameraEvent = cameraEvent;
                            iframeListener.sendCameraUpdated(cameraEvent);
                            this.firstCameraUpdateSent = true;
                        }
                    );
                }
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.loadSoundStream.subscribe((loadSoundEvent) => {
                const url = new URL(loadSoundEvent.url, this.mapUrlFile);
                soundManager.loadSound(this.load, this.sound, url.toString()).catch((e) => console.error(e));
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.loadPageStream.subscribe((url: string) => {
                this.loadNextGameFromExitUrl(url)
                    .then(() => {
                        this.events.once(EVENT_TYPE.POST_UPDATE, () => {
                            this.onMapExit(Room.getRoomPathFromExitUrl(url, window.location.toString())).catch((e) =>
                                console.error(e)
                            );
                        });
                    })
                    .catch((e) => console.error(e));
            })
        );
        let scriptedBubbleSprite: Sprite;
        this.iframeSubscriptionList.push(
            iframeListener.displayBubbleStream.subscribe(() => {
                scriptedBubbleSprite = new Sprite(
                    this,
                    this.CurrentPlayer.x + 25,
                    this.CurrentPlayer.y,
                    "circleSprite-white"
                );
                scriptedBubbleSprite.setDisplayOrigin(48, 48).setDepth(DEPTH_BUBBLE_CHAT_SPRITE);
                this.add.existing(scriptedBubbleSprite);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.removeBubbleStream.subscribe(() => {
                scriptedBubbleSprite.destroy();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.showLayerStream.subscribe((layerEvent) => {
                this.gameMapFrontWrapper.setLayerVisibility(layerEvent.name, true);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.hideLayerStream.subscribe((layerEvent) => {
                this.gameMapFrontWrapper.setLayerVisibility(layerEvent.name, false);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.setPropertyStream.subscribe((setProperty) => {
                this.setPropertyLayer(setProperty.layerName, setProperty.propertyName, setProperty.propertyValue);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.setAreaPropertyStream.subscribe((setProperty) => {
                this.setAreaProperty(setProperty.areaName, setProperty.propertyName, setProperty.propertyValue);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.banPlayerIframeEvent.subscribe((banPlayerEvent) => {
                this.connection?.emitBanPlayerMessage(banPlayerEvent.uuid, banPlayerEvent.name);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.mapEditorStream.subscribe((isActivated: boolean) => {
                mapManagerActivated.set(isActivated);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.screenSharingStream.subscribe((isActivated: boolean) => {
                screenSharingActivatedStore.set(isActivated);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.rightClickStream.subscribe((isRestore: boolean) => {
                if (isRestore) this.userInputManager.restoreRightClick();
                else this.userInputManager.disableRightClick();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.wheelZoomStream.subscribe((isRestore: boolean) => {
                if (isRestore) this.cameraManager.unlockZoom();
                else this.cameraManager.lockZoom();
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.inviteUserButtonStream.subscribe((isActivated: boolean) => {
                inviteUserActivated.set(isActivated);
            })
        );

        this.iframeSubscriptionList.push(
            iframeListener.roomListButtonStream.subscribe((isActivated: boolean) => {
                roomListActivated.set(isActivated);
            })
        );

        iframeListener.registerAnswerer("openCoWebsite", (openCoWebsite, source) => {
            return openCoWebSite(openCoWebsite, source);
        });

        iframeListener.registerAnswerer("getCoWebsites", () => {
            return getCoWebSite();
        });

        iframeListener.registerAnswerer("closeCoWebsite", (coWebsiteId) => {
            return closeCoWebsite(coWebsiteId);
        });

        iframeListener.registerAnswerer("closeCoWebsites", () => {
            return coWebsites.removeAll();
        });

        iframeListener.registerAnswerer("openUIWebsite", (websiteConfig) => {
            return uiWebsiteManager.open(websiteConfig);
        });

        iframeListener.registerAnswerer("getUIWebsites", () => {
            return uiWebsiteManager.getAll();
        });

        iframeListener.registerAnswerer("getUIWebsiteById", (websiteId) => {
            const website = uiWebsiteManager.getById(websiteId);
            if (!website) {
                throw new Error("Unknown ui-website");
            }
            return website;
        });

        iframeListener.registerAnswerer("closeUIWebsite", (websiteId) => {
            return uiWebsiteManager.close(websiteId);
        });

        iframeListener.registerAnswerer("getMapData", () => {
            return {
                data: this.gameMapFrontWrapper.getMap(),
            };
        });

        iframeListener.registerAnswerer("getWamMapData", () => {
            return {
                data: this.gameMapFrontWrapper.getGameMap().getWam(),
            };
        });

        iframeListener.registerAnswerer("getState", async (query, source): Promise<GameStateEvent> => {
            // The sharedVariablesManager is not instantiated before the connection is established. So we need to wait
            // for the connection to send back the answer.
            await this.connectionAnswerPromiseDeferred.promise;
            return {
                playerId: this.connection?.getUserId(),
                mapUrl: this.mapUrlFile,
                hashParameters: urlManager.getHashParameters(),
                startLayerName: this.startPositionCalculator.getStartPositionName() ?? undefined,
                uuid: localUserStore.getLocalUser()?.uuid,
                nickname: this.playerName,
                language: get(locale),
                roomId: this.roomUrl,
                tags: this.connection ? this.connection.getAllTags() : [],
                variables: this.sharedVariablesManager.variables,
                //playerVariables: localUserStore.getAllUserProperties(),
                playerVariables: this.playerVariablesManager.variables,
                userRoomToken: this.connection ? this.connection.userRoomToken : "",
                metadata: this._room.metadata,
                iframeId: source ? iframeListener.getUIWebsiteIframeIdFromSource(source) : undefined,
                isLogged: this.room.isLogged,
            };
        });
        this.iframeSubscriptionList.push(
            iframeListener.setTilesStream.subscribe((eventTiles) => {
                for (const eventTile of eventTiles) {
                    this.gameMapFrontWrapper.putTile(eventTile.tile, eventTile.x, eventTile.y, eventTile.layer);
                    this.animatedTiles.updateAnimatedTiles(eventTile.x, eventTile.y);
                }
            })
        );
        iframeListener.registerAnswerer("enablePlayersTracking", (enablePlayersTrackingEvent, source) => {
            if (source === null) {
                throw new Error('Missing source in "enablePlayersTracking" query. This should never happen.');
            }

            if (enablePlayersTrackingEvent.movement === true && enablePlayersTrackingEvent.players === false) {
                throw new Error("Cannot enable movement without enabling players first");
            }

            let sendPlayers = false;

            if (enablePlayersTrackingEvent.players) {
                sendPlayers = this.playersEventDispatcher.addIframe(source);
            } else {
                this.playersEventDispatcher.removeIframe(source);
            }
            if (enablePlayersTrackingEvent.movement) {
                this.playersMovementEventDispatcher.addIframe(source);
            } else {
                this.playersMovementEventDispatcher.removeIframe(source);
            }

            const addPlayerEvents: AddPlayerEvent[] = [];
            if (sendPlayers) {
                if (enablePlayersTrackingEvent.players) {
                    for (const player of this.remotePlayersRepository.getPlayers().values()) {
                        addPlayerEvents.push(RemotePlayersRepository.toIframeAddPlayerEvent(player));
                    }
                }
            }
            return addPlayerEvents;
        });
        iframeListener.registerAnswerer("loadTileset", (eventTileset) => {
            return this.connectionAnswerPromiseDeferred.promise.then(() => {
                const jsonTilesetDir = eventTileset.url.substring(0, eventTileset.url.lastIndexOf("/"));
                //Initialise the firstgid to 1 because if there is no tileset in the tilemap, the firstgid will be 1
                let newFirstgid = 1;
                const lastTileset = this.mapFile.tilesets[this.mapFile.tilesets.length - 1];
                if (
                    lastTileset &&
                    lastTileset.firstgid !== undefined &&
                    "tilecount" in lastTileset &&
                    lastTileset.tilecount !== undefined
                ) {
                    //If there is at least one tileset in the tilemap then calculate the firstgid of the new tileset
                    newFirstgid = lastTileset.firstgid + lastTileset.tilecount;
                }

                return new Promise((resolve, reject) => {
                    const errorHandler = (file: Phaser.Loader.File) => {
                        if (file.src === eventTileset.url) {
                            console.error("Error while loading " + eventTileset.url + ".");
                            reject(new Error("Error while loading " + eventTileset.url + "."));
                        }
                        this.load.off("loaderror", errorHandler);
                    };

                    this.load.once("filecomplete-json-" + eventTileset.url, () => {
                        let jsonTileset = this.cache.json.get(eventTileset.url);
                        const imageUrl = jsonTilesetDir + "/" + jsonTileset.image;

                        this.load.image(imageUrl, imageUrl);
                        this.load.once("filecomplete-image-" + imageUrl, () => {
                            //Add the firstgid of the tileset to the json file
                            jsonTileset = { ...jsonTileset, firstgid: newFirstgid };
                            this.mapFile.tilesets.push(jsonTileset);
                            this.Map.tilesets.push(
                                new Tileset(
                                    jsonTileset.name,
                                    jsonTileset.firstgid,
                                    jsonTileset.tileWidth,
                                    jsonTileset.tileHeight,
                                    jsonTileset.margin,
                                    jsonTileset.spacing,
                                    jsonTileset.tiles
                                )
                            );
                            const tilesetImage = this.Map.addTilesetImage(
                                jsonTileset.name,
                                imageUrl,
                                jsonTileset.tilewidth,
                                jsonTileset.tileheight,
                                jsonTileset.margin,
                                jsonTileset.spacing
                            );
                            if (tilesetImage) {
                                this.Terrains.push(tilesetImage);
                            } else {
                                console.warn(`Failed to add TilesetImage ${jsonTileset.name}: ${imageUrl}`);
                            }
                            //destroy the tilemapayer because they are unique and we need to reuse their key and layerdData
                            for (const layer of this.Map.layers) {
                                layer.tilemapLayer.destroy(false);
                            }
                            this.gameMapFrontWrapper?.close();
                            //Create a new GameMap with the changed file
                            this.gameMapFrontWrapper = new GameMapFrontWrapper(
                                this,
                                new GameMap(this.mapFile, this.wamFile),
                                this.Map,
                                this.Terrains
                            );
                            // Unsubscribe if needed and subscribe to GameMapChanged event again
                            this.subscribeToGameMapChanged();
                            this.subscribeToEntitiesManagerObservables();
                            //Destroy the colliders of the old tilemapLayer
                            this.physics.add.world.colliders.destroy();
                            //Create new colliders with the new GameMap
                            this.createCollisionWithPlayer();
                            //Create new trigger with the new GameMap
                            new GameMapPropertiesListener(this, this.gameMapFrontWrapper).register();
                            resolve(newFirstgid);
                        });
                        this.load.off("loaderror", errorHandler);
                    });
                    this.load.on("loaderror", errorHandler);

                    this.load.json(eventTileset.url, eventTileset.url);
                    this.load.start();
                });
            });
        });

        iframeListener.registerAnswerer("triggerActionMessage", (message) =>
            popupStore.addPopup(
                PopUpTriggerActionMessage,
                {
                    message: message.message,
                    click: () => {
                        popupStore.removePopup(message.uuid);
                        iframeListener.sendActionMessageTriggered(message.uuid);
                    },
                    userInputManager: this.userInputManager,
                },
                message.uuid
            )
        );

        iframeListener.registerAnswerer("triggerPlayerMessage", (message) =>
            this.CurrentPlayer.playText(message.uuid, message.message, undefined, () => {
                this.CurrentPlayer.destroyText(message.uuid);
                iframeListener.sendActionMessageTriggered(message.uuid);
            })
        );

        iframeListener.registerAnswerer("setVariable", (event, source) => {
            // TODO: "setVariable" message has a useless "target"
            // TODO: "setVariable" message has a useless "target"
            // TODO: "setVariable" message has a useless "target"
            // TODO: design another message when sending from iframeAPI to front

            this.sharedVariablesManager.setVariable(event, source);
            /*switch (event.target) {
                case "global": {
                    break;
                }
                case "player": {
                    localUserStore.setUserProperty(event.key, event.value);
                    break;
                }
                case "sharedPlayer": {
                    this.connection?.emitPlayerSetVariable(event.key, event.value);
                    // const clientToServerMessage = new ClientToServerMessage();
                    // clientToServerMessage.setSetplayerdetailsmessage(message);
                    // this.socket.send(clientToServerMessage.serializeBinary().buffer);
                    break;
                }
                default: {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const _exhaustiveCheck: never = event.target;
                }
            }*/
        });

        iframeListener.registerAnswerer("removeActionMessage", (message) => {
            popupStore.removePopup(message.uuid);
        });

        iframeListener.registerAnswerer("removePlayerMessage", (message) => {
            this.CurrentPlayer.destroyText(message.uuid);
        });

        iframeListener.registerAnswerer("setPlayerOutline", (message) => {
            const normalizeColor = (color: number) => Math.min(Math.max(0, Math.round(color)), 255);
            const red = normalizeColor(message.red);
            const green = normalizeColor(message.green);
            const blue = normalizeColor(message.blue);
            const color = (red << 16) | (green << 8) | blue;
            this.CurrentPlayer.setApiOutlineColor(color);
            this.connection?.emitPlayerOutlineColor(color);
        });

        iframeListener.registerAnswerer("removePlayerOutline", () => {
            this.CurrentPlayer.removeApiOutlineColor();
            this.connection?.emitPlayerOutlineColor(null);
        });

        iframeListener.registerAnswerer("getPlayerPosition", () => {
            return {
                x: this.CurrentPlayer.x,
                y: this.CurrentPlayer.y,
            };
        });

        iframeListener.registerAnswerer("movePlayerTo", async (message) => {
            return this.moveTo({ x: message.x, y: message.y }, true, message.speed);
        });

        iframeListener.registerAnswerer("teleportPlayerTo", (message) => {
            this.CurrentPlayer.x = message.x;
            this.CurrentPlayer.y = message.y;
            this.CurrentPlayer.finishFollowingPath(true);
            // clear properties in case we are moved on the same layer / area in order to trigger them
            //this.gameMapFrontWrapper.clearCurrentProperties();

            /*this.handleCurrentPlayerHasMovedEvent({
                x: message.x,
                y: message.y,
                direction: this.CurrentPlayer.lastDirection,
                moving: false,
            });*/
            this.markDirty();
        });

        iframeListener.registerAnswerer("getWoka", () => {
            return new Promise((res, rej) => {
                const woka = get(currentPlayerWokaStore);
                if (woka) {
                    res(woka);
                    return;
                }

                // If we could not get the Woka right away (because it is not available yet), let's subscribe to the update
                // and resolve as soon as we have a value
                let unsubscribe: (() => void) | undefined;
                //eslint-disable-next-line prefer-const
                unsubscribe = currentPlayerWokaStore.subscribe((woka) => {
                    if (woka !== undefined) {
                        if (unsubscribe) {
                            unsubscribe();
                        }
                        res(woka);
                    }
                });
            });
        });

        iframeListener.registerAnswerer("goToLogin", () => {
            if (!ENABLE_OPENID) {
                throw new Error("Cannot access login page. OpenID connect must configured first.");
            }
            scriptUtils.goToPage("/login");
        });

        iframeListener.registerAnswerer("playSoundInBubble", async (message) => {
            const soundUrl = new URL(message.url, this.mapUrlFile);
            console.error("playSoundInBubble", soundUrl);
            try {
                const proximityChatRoom = await this._proximityChatRoomDeferred.promise;
                await proximityChatRoom.dispatchSound(soundUrl);
            } catch (error) {
                console.error("Error playing sound in bubble:", error);
            }
        });
    }

    private setPropertyLayer(
        layerName: string,
        propertyName: string,
        propertyValue: string | number | boolean | undefined
    ): void {
        if (propertyName === GameMapProperties.EXIT_URL && typeof propertyValue === "string") {
            this.loadNextGameFromExitUrl(propertyValue).catch((e) => console.error(e));
        }
        this.gameMapFrontWrapper.setLayerProperty(layerName, propertyName, propertyValue);
    }

    private setAreaProperty(areaName: string, propertyName: string, propertyValue: unknown): void {
        this.gameMapFrontWrapper.setDynamicAreaProperty(areaName, propertyName, propertyValue);
    }

    private removeAllRemotePlayers(): void {
        this.MapPlayersByKey.forEach((player: RemotePlayer) => {
            player.destroy();

            if (player.companion) {
                player.companion.destroy();
            }
        });
        this.MapPlayersByKey.clear();
    }

    private tryOpenMapEditorWithToolEditorParameter(): void {
        const toolEditorParam = urlManager.getHashParameter("mapEditor");
        if (toolEditorParam) {
            if (!get(mapEditorActivated)) {
                popupStore.addPopup(
                    PopUpMapEditorNotEnabled,
                    {
                        message: get(LL).warning.mapEditorNotEnabled(),
                        click: () => {
                            popupStore.removePopup("mapEditorNotEnabled");
                        },
                        userInputManager: this.userInputManager,
                    },
                    "mapEditorNotEnabled"
                );

                setTimeout(() => popupStore.removePopup("mapEditorNotEnabled"), 6_000);
            } else {
                switch (toolEditorParam) {
                    case "wamSettingsEditorTool": {
                        mapEditorModeStore.switchMode(true);
                        mapEditorSelectedToolStore.set(EditorToolName.WAMSettingsEditor);
                        const menuItem = urlManager.getHashParameter("menuItem");
                        if (menuItem) {
                            switch (menuItem) {
                                case "megaphone": {
                                    mapEditorWamSettingsEditorToolCurrentMenuItemStore.set(
                                        WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM.Megaphone
                                    );
                                    break;
                                }
                                default: {
                                    mapEditorWamSettingsEditorToolCurrentMenuItemStore.set(undefined);
                                    break;
                                }
                            }
                        }
                        break;
                    }
                    case "floor": {
                        mapEditorModeStore.switchMode(true);
                        mapEditorSelectedToolStore.set(EditorToolName.FloorEditor);
                        break;
                    }
                    case "entity": {
                        mapEditorModeStore.switchMode(true);
                        mapEditorSelectedToolStore.set(EditorToolName.EntityEditor);
                        break;
                    }
                    case "area": {
                        mapEditorModeStore.switchMode(true);
                        mapEditorSelectedToolStore.set(EditorToolName.AreaEditor);
                        break;
                    }
                    default: {
                        popupStore.addPopup(
                            PopUpMapEditorShortcut,
                            {
                                message: get(LL).warning.mapEditorShortCut(),
                                click: () => {
                                    popupStore.removePopup("mapEditorShortCut");
                                },
                                userInputManager: this.userInputManager,
                            },
                            "mapEditorShortCut"
                        );

                        setTimeout(() => popupStore.removePopup("mapEditorShortCut"), 6_000);
                        break;
                    }
                }
            }
            urlManager.clearHashParameter();
        }
    }

    /**
     * Analyze the #moveTo parameter in the URL.
     * This function will try to move the player
     *
     * - to the X,Y coordinates if this is X,Y coordinates
     * - if not, to the WAM area with the given name
     * - if not found, to the Tiled area with the given name
     * - if not found, to the Tiled layer with the given name
     */
    private tryMovePlayerWithMoveToParameter(): void {
        const moveToParam = urlManager.getHashParameter("moveTo");
        if (moveToParam) {
            try {
                let endPos: { x: number; y: number };
                const posFromParam = StringUtils.parsePointFromParam(moveToParam);
                if (posFromParam) {
                    endPos = posFromParam;
                } else {
                    // First, try by id
                    let areaData = this.gameMapFrontWrapper.getAreas()?.get(moveToParam);
                    if (!areaData) {
                        areaData = this.gameMapFrontWrapper.getAreaByName(moveToParam);
                    }
                    if (areaData) {
                        endPos = MathUtils.randomPositionFromRect(areaData);
                    } else {
                        const destinationObject = this.gameMapFrontWrapper.getObjectWithName(moveToParam);
                        if (destinationObject) {
                            endPos = destinationObject;
                        } else {
                            endPos = this.pathfindingManager.mapTileUnitToPixels(
                                this.gameMapFrontWrapper.getRandomPositionFromLayer(moveToParam)
                            );
                        }
                    }
                }

                this.moveTo(endPos).catch((e) => console.warn(e));

                urlManager.clearHashParameter();
            } catch (err) {
                console.warn(`Cannot proceed with moveTo command:\n\t-> ${err}`);
            }
        }
    }

    private tryMovePlayerWithMoveToUserParameter(): void {
        const uuidParam = urlManager.getHashParameter("moveToUser");
        if (uuidParam) {
            this.connection?.emitAskPosition(uuidParam, this.roomUrl);
            urlManager.clearHashParameter();
        }
    }

    /**
     * Walk the player to position x,y expressed in Game pixels.
     */
    public async moveTo(
        position: { x: number; y: number },
        tryFindingNearestAvailable = false,
        speed: number | undefined = undefined
    ): Promise<{ x: number; y: number; cancelled: boolean }> {
        const path = await this.getPathfindingManager().findPathFromGameCoordinates(
            {
                x: this.CurrentPlayer.x,
                y: this.CurrentPlayer.y,
            },
            position,
            tryFindingNearestAvailable
        );
        if (path.length === 0) throw new Error("No path found");
        return this.CurrentPlayer.setPathToFollow(path, speed);
    }

    private getExitUrl(layer: ITiledMapLayer): string | undefined {
        const property = PropertyUtils.findStringProperty(GameMapProperties.EXIT_URL, layer.properties);
        return property;
    }

    /**
     * @deprecated the map property exitSceneUrl is deprecated
     */
    private getExitSceneUrl(layer: ITiledMapLayer): string | undefined {
        const property = PropertyUtils.findStringProperty(GameMapProperties.EXIT_SCENE_URL, layer.properties);
        return property;
    }

    private getScriptUrls(map: ITiledMap): string[] {
        const script = PropertyUtils.findStringProperty(GameMapProperties.SCRIPT, map.properties);

        if (!script) {
            return [];
        }

        return script.split("\n").map((scriptSplit) => new URL(scriptSplit, this.mapUrlFile).toString());
    }

    private loadNextGameFromExitUrl(exitUrl: string): Promise<void> {
        return this.loadNextGame(Room.getRoomPathFromExitUrl(exitUrl, window.location.toString()));
    }

    //todo: push that into the gameManager
    private async loadNextGame(exitRoomPath: URL): Promise<void> {
        try {
            const room = await Room.createRoom(exitRoomPath);
            return gameManager.loadMap(room);
        } catch (e /*: unknown*/) {
            console.warn('Error while pre-loading exit room "' + exitRoomPath.toString() + '"', e);
        }
    }

    private handleCurrentPlayerHasMovedEvent(event: HasPlayerMovedInterface): void {
        //listen event to share position of user
        this.pushPlayerPosition(event);
        this.gameMapFrontWrapper.setPosition(event.x, event.y);
        this.activatablesManager.updateActivatableObjectsDistances([
            ...Array.from(this.MapPlayersByKey.values()),
            ...this.actionableItems.values(),
            ...this.gameMapFrontWrapper.getActivatableEntities(),
        ]);
        this.activatablesManager.deduceSelectedActivatableObjectByDistance();

        // Call movement ended callbacks if movement just ended
        for (const cb of this.onPlayerMovementEndedCallbacks) {
            cb(event);
        }
        this.hasMovedThisFrame = true;
    }

    private createCollisionWithPlayer() {
        //add collision layer
        for (const phaserLayer of this.gameMapFrontWrapper.phaserLayers) {
            this.physics.add.collider(
                this.CurrentPlayer,
                phaserLayer,
                (
                    object1:
                        | Phaser.Physics.Arcade.Body
                        | Phaser.Tilemaps.Tile
                        | Phaser.Types.Physics.Arcade.GameObjectWithBody,
                    object2:
                        | Phaser.Physics.Arcade.Body
                        | Phaser.Tilemaps.Tile
                        | Phaser.Types.Physics.Arcade.GameObjectWithBody
                ) => {}
            );
            phaserLayer.setCollisionByProperty({ collides: true });
            if (DEBUG_MODE) {
                //debug code to see the collision hitbox of the object in the top layer
                phaserLayer.renderDebug(this.add.graphics(), {
                    tileColor: null, //non-colliding tiles
                    collidingTileColor: new Phaser.Display.Color(243, 134, 48, 200), // Colliding tiles,
                    faceColor: new Phaser.Display.Color(40, 39, 37, 255), // Colliding face edges
                });
            }
            //});
        }
    }

    private createCurrentPlayer() {
        //TODO create animation moving between exit and start
        try {
            this.CurrentPlayer = new Player(
                this,
                this.startPositionCalculator.startPosition.x,
                this.startPositionCalculator.startPosition.y,
                this.playerName,
                this.currentPlayerTexturesPromise,
                PositionMessage_Direction.DOWN,
                false,
                this.currentCompanionTexturePromise
            );
            this.CurrentPlayer.on(Phaser.Input.Events.POINTER_OVER, (pointer: Phaser.Input.Pointer) => {
                this.CurrentPlayer.pointerOverOutline(0x365dff);
            });
            this.CurrentPlayer.on(Phaser.Input.Events.POINTER_OUT, (pointer: Phaser.Input.Pointer) => {
                this.CurrentPlayer.pointerOutOutline();
            });
            this.CurrentPlayer.on(requestEmoteEventName, (emoteKey: string) => {
                this.connection?.emitEmoteEvent(emoteKey);
            });
        } catch (error) {
            if (error instanceof CharacterTextureError) {
                console.warn("Error while loading current player character texture", error.message);
                gameManager.leaveGame(SelectCharacterSceneName, new SelectCharacterScene());
            } else if (error instanceof CompanionTextureError) {
                console.warn("Error while loading current player companion texture", error.message);
                gameManager.leaveGame(SelectCompanionSceneName, new SelectCompanionScene());
            }
            throw error;
        }

        //create collision
        this.createCollisionWithPlayer();
    }

    private pushPlayerPosition(event: HasPlayerMovedInterface) {
        if (this.lastMoveEventSent === event) {
            return;
        }

        // If the player is not moving, let's send the info right now.
        if (event.moving === false) {
            this.doPushPlayerPosition(event);
            return;
        }

        // If the player is moving, and if it changed direction, let's send an event
        if (event.direction !== this.lastMoveEventSent.direction) {
            this.doPushPlayerPosition(event);
            return;
        }

        // If more than 200ms happened since last event sent
        if (this.currentTick - this.lastSentTick >= POSITION_DELAY) {
            this.doPushPlayerPosition(event);
            return;
        }

        // Otherwise, do nothing.
    }

    private doPushPlayerPosition(event: HasPlayerMovedInterface): void {
        this.lastMoveEventSent = event;
        this.lastSentTick = this.currentTick;
        const camera = this.cameras.main;
        let viewport = {
            left: camera.scrollX,
            top: camera.scrollY,
            right: camera.scrollX + camera.width,
            bottom: camera.scrollY + camera.height,
        };
        if (!this.scene.scene.renderer) {
            // In the very special case where we have no renderer, the viewport will not move along the Woka.
            // We need to adjust it manually. We set it to something very large to make sure the Woka sees
            // everything around (useful for bots, even if so far, it is a trick)
            viewport = {
                left: event.x - 3_000,
                top: event.y - 3_000,
                right: event.x + 3_000,
                bottom: event.y + 3_000,
            };
        }
        this.connection?.sharePosition(event.x, event.y, event.direction, event.moving, viewport);
        iframeListener.hasPlayerMoved(event);
    }

    private doAddPlayer(addPlayerData: AddPlayerInterface): void {
        //check if exist player, if exist, move position
        // Can this really happen? yes..
        if (this.MapPlayersByKey.has(addPlayerData.userId)) {
            console.warn("Got instructed to add a player that already exists: ", addPlayerData.userId);
            console.error(
                "Players status",
                this.remotePlayersRepository.getPlayers(),
                this.MapPlayersByKey,
                "Added players:",
                this.remotePlayersRepository.getAddedPlayers(),
                "Moved players:",
                this.remotePlayersRepository.getMovedPlayers(),
                "Updated players:",
                this.remotePlayersRepository.getUpdatedPlayers(),
                "Removed players:",
                this.remotePlayersRepository.getRemovedPlayers()
            );
            return;
        }

        let player: RemotePlayer;

        try {
            player = new RemotePlayer(
                addPlayerData.userId,
                addPlayerData.userUuid,
                this,
                addPlayerData.position.x,
                addPlayerData.position.y,
                addPlayerData.name,
                lazyLoadPlayerCharacterTextures(this.superLoad, addPlayerData.characterTextures),
                addPlayerData.position.direction,
                addPlayerData.position.moving,
                addPlayerData.visitCardUrl,
                addPlayerData.companionTexture
                    ? lazyLoadPlayerCompanionTexture(this.superLoad, addPlayerData.companionTexture)
                    : new CancelablePromise<string>((_, reject) =>
                          reject(new CompanionTextureError("No companion texture"))
                      ),
                undefined,
                undefined,
                addPlayerData.sayMessage
            );
        } catch (error) {
            if (error instanceof CharacterTextureError) {
                console.warn("Error while loading remote player character texture", error.message);
            } else if (error instanceof CompanionTextureError) {
                console.warn("Error while loading remote player companion texture", error.message);
            }
            throw error;
        }

        if (addPlayerData.outlineColor !== undefined) {
            player.setApiOutlineColor(addPlayerData.outlineColor);
        }
        if (addPlayerData.availabilityStatus !== 0) {
            player.setAvailabilityStatus(addPlayerData.availabilityStatus, true);
        }
        this.MapPlayersByKey.set(player.userId, player);
        player.updatePosition(addPlayerData.position);

        player.on(Phaser.Input.Events.POINTER_OVER, () => {
            this.activatablesManager.handlePointerOverActivatableObject(player);
            this.markDirty();
        });

        player.on(Phaser.Input.Events.POINTER_OUT, () => {
            this.activatablesManager.handlePointerOutActivatableObject();
            this.markDirty();
        });
    }

    private tryChangeShowVoiceIndicatorState(show: boolean): void {
        this.CurrentPlayer.toggleTalk(show);
        if (this.showVoiceIndicatorChangeMessageSent && !show) {
            this.connection?.emitPlayerShowVoiceIndicator(false);
            this.showVoiceIndicatorChangeMessageSent = false;
        } else if (!this.showVoiceIndicatorChangeMessageSent && show) {
            this.connection?.emitPlayerShowVoiceIndicator(true);
            this.showVoiceIndicatorChangeMessageSent = true;
        }
    }

    private subscribeToGameMapChanged(): void {
        this.gameMapChangedSubscription?.unsubscribe();
        this.gameMapChangedSubscription = this.gameMapFrontWrapper
            .getMapChangedObservable()
            .subscribe((collisionGrid) => {
                this.pathfindingManager.setCollisionGrid(collisionGrid);
                this.markDirty();
                const playerDestination = this.CurrentPlayer.getCurrentPathDestinationPoint();
                if (playerDestination) {
                    this.moveTo(playerDestination, true).catch((reason) => console.warn(reason));
                }
            });
    }

    private subscribeToEntitiesManagerObservables(): void {
        this.rxJsSubscriptions.push(
            this.gameMapFrontWrapper
                .getEntitiesManager()
                .getPointerOverEntityObservable()
                .subscribe((entity) => {
                    if (get(mapEditorModeStore)) {
                        return;
                    }
                    this.activatablesManager.handlePointerOverActivatableObject(entity);
                    this.markDirty();
                })
        );
        this.rxJsSubscriptions.push(
            this.gameMapFrontWrapper
                .getEntitiesManager()
                .getPointerOutEntityObservable()
                .subscribe((entity) => {
                    if (get(mapEditorModeStore)) {
                        return;
                    }
                    this.activatablesManager.handlePointerOutActivatableObject();
                    this.markDirty();
                })
        );
    }

    private doRemovePlayer(userId: number) {
        const player = this.MapPlayersByKey.get(userId);
        if (player === undefined) {
            console.error("Cannot find user with id ", userId);
        } else {
            player.destroy();

            if (player.companion) {
                player.companion.destroy();
            }
        }
        this.MapPlayersByKey.delete(userId);
        // console.debug("User removed in MapPlayersByKey in GameScene", userId);
        this.playersPositionInterpolator.removePlayer(userId);
    }

    private updatePlayerPosition(message: MessageUserMovedInterface): void {
        this.playersMovementEventDispatcher.postMessage({
            type: "remotePlayerChanged",
            data: {
                playerId: message.userId,
                position: {
                    x: message.position.x,
                    y: message.position.y,
                    // TODO: make sure we can also have the "running" and "position" info
                },
            },
        });
    }

    private doUpdatePlayerPosition(message: MessageUserMovedInterface): void {
        const player: RemotePlayer | undefined = this.MapPlayersByKey.get(message.userId);
        if (player === undefined) {
            //throw new Error('Cannot find player with ID "' + message.userId +'"');
            console.error('Cannot update position of player with ID "' + message.userId + '": player not found');
            return;
        }

        // We do not update the player position directly (because it is sent only every 200ms).
        // Instead we use the PlayersPositionInterpolator that will do a smooth animation over the next 200ms.
        const playerMovement = new PlayerMovement(
            { x: player.x, y: player.y },
            this.currentTick,
            {
                ...message.position,
            },
            this.currentTick + POSITION_DELAY
        );
        this.playersPositionInterpolator.updatePlayerPosition(player.userId, playerMovement);
    }

    private shareGroupPosition(groupPositionMessage: GroupCreatedUpdatedMessageInterface) {
        this.pendingEvents.enqueue({
            type: "GroupCreatedUpdatedEvent",
            event: groupPositionMessage,
        });
    }

    private doShareGroupPosition(groupPositionMessage: GroupCreatedUpdatedMessageInterface): void {
        // TODO: keep a reference to the group sprite in the conversationBubble
        const existingGroup = this.groups.get(groupPositionMessage.groupId);
        if (existingGroup) {
            existingGroup.setCenter(
                Math.round(groupPositionMessage.position.x),
                Math.round(groupPositionMessage.position.y)
            );
            existingGroup.setLocked(
                groupPositionMessage.groupSize === MAX_PER_GROUP || (groupPositionMessage.locked ?? false)
            );
            return;
        }

        // If we have a new group
        const conversationBubble = new ConversationBubble(
            this,
            Math.round(groupPositionMessage.position.x),
            Math.round(groupPositionMessage.position.y),
            groupPositionMessage.groupSize === MAX_PER_GROUP || (groupPositionMessage.locked ?? false),
            groupPositionMessage.userIds
        );

        this.groups.set(groupPositionMessage.groupId, conversationBubble);
        if (this.currentPlayerGroupId === groupPositionMessage.groupId) {
            currentPlayerGroupLockStateStore.set(groupPositionMessage.locked);
        }
    }

    //todo: put this into an 'orchestrator' scene (EntryScene?)
    private bannedUser() {
        errorScreenStore.setError(
            ErrorScreenMessage.fromPartial({
                type: "error",
                code: "USER_BANNED",
                title: "BANNED",
                subtitle: "You were banned from WorkAdventure",
                details: "If you want more information, you may contact us at: hello@workadventu.re",
            })
        );

        this.cleanupClosingScene();

        this.userInputManager.disableControls("errorScreen");
    }

    //todo: put this into an 'orchestrator' scene (EntryScene?)
    private showWorldFullError(message: string | null): void {
        this.cleanupClosingScene();

        this.scene.stop(ReconnectingSceneName);
        this.scene.remove(ReconnectingSceneName);
        this.userInputManager.disableControls("errorScreen");
        //FIX ME to use status code
        if (message == undefined) {
            this.scene.start(ErrorSceneName, {
                title: "Connection rejected",
                subTitle: "The world you are trying to join is full. Try again later.",
                message: "If you want more information, you may contact us at: hello@workadventu.re",
            });
        } else {
            this.scene.start(ErrorSceneName, {
                title: "Connection rejected",
                subTitle: "You cannot join the World. Try again later. \n\r \n\r Error: " + message + ".",
                message:
                    "If you want more information, you may contact administrator or contact us at: hello@workadventu.re",
            });
        }
    }

    private bindSceneEventHandlers(): void {
        this.events.once("shutdown", () => {
            if (!this.cleanupDone) {
                throw new Error("Scene destroyed without cleanup!");
            }
        });
    }

    handleMouseWheel(deltaY: number) {
        // Calculate the velocity of the zoom
        //const velocity = deltaY / 30;

        // Calculate the zoom factor
        //const zoomFactor = 1 - velocity * 0.1;

        // Explanation of the formula: to Zoom x 2, we need a delta of 200
        // Question: Why 200 ? For mac usage, it's too slow
        let zoomFactor = Math.exp((-deltaY * Math.log(2)) /* / 200 */ / 100);

        // Sometimes, deltaY can be really high (this happens when the browser is lagging for 1 second or so)
        // Let's clamp the value to avoid zooming too much
        zoomFactor = Clamp(zoomFactor, 0.5, 2);

        debugZoom("DeltaY: ", deltaY, "Zoom factor", zoomFactor);

        // Apply the zoom
        this.zoomByFactor(zoomFactor, true);
    }

    zoomByFactor(zoomFactor: number, smooth: boolean) {
        if (this.cameraManager.isZoomLocked()) {
            return;
        }

        this.cameraManager.zoomByFactor(zoomFactor, smooth);
    }

    get room(): Room {
        return this._room;
    }

    get sceneReadyToStartPromise(): Promise<void> {
        return this.sceneReadyToStartDeferred.promise;
    }

    private whiteMask: Phaser.GameObjects.Graphics | undefined;

    /**
     * Applies a white mask on top of the screen with the given alpha value.
     * Useful for the zoom out resistance effect.
     */
    public applyWhiteMask(alpha: number): void {
        if (!this.whiteMask) {
            this.whiteMask = this.add.graphics();
        }

        this.whiteMask.clear();
        this.whiteMask.fillStyle(0xffffff, alpha);
        const camera = this.cameras.main;
        //this.whiteMask.fillRect(camera.scrollX, camera.scrollY, camera.width, camera.height);
        // Let's apply some margin because in the zoom process, the camera will move
        this.whiteMask.fillRect(
            camera.scrollX - camera.width * 0.5,
            camera.scrollY - camera.height * 0.5,
            camera.width * 2,
            camera.height * 2
        );
        this.whiteMask.setDepth(DEPTH_WHITE_MASK);
    }

    public removeWhiteMask(): void {
        if (!this.whiteMask) {
            return;
        }
        this.whiteMask.destroy();
        this.whiteMask = undefined;
    }

    private configureResistanceToZoomOut(): void {
        this.cameraManager.setResistanceZone(
            0.6,
            0.3,
            1,
            () => {
                mapEditorModeStore.switchMode(true);
                this.mapEditorModeManager.equipTool(EditorToolName.ExploreTheRoom);
            },
            true,
            undefined,
            this.CurrentPlayer
        );
    }

    private configureResistanceToZoomIn(): void {
        this.cameraManager.setResistanceZone(
            0.3,
            0.6,
            1,
            () => {
                mapEditorModeStore.switchMode(false);
            },
            false,
            300,
            this.CurrentPlayer
        );
    }

    private disableCameraResistance(): void {
        this.cameraManager.disableResistanceZone();
    }

    private proximityChatRoomPromise(): Promise<ProximityChatRoom> {
        if (this._proximityChatRoom) {
            return Promise.resolve(this._proximityChatRoom);
        }

        return this._proximityChatRoomDeferred.promise;
    }

    get spaceRegistry(): SpaceRegistryInterface {
        if (!this._spaceRegistry) {
            throw new Error("_spaceRegistry not yet initialized");
        }
        return this._spaceRegistry;
    }

    get proximityChatRoom(): ProximityChatRoom {
        if (!this._proximityChatRoom) {
            throw new Error("_proximityChatRoom not yet initialized");
        }
        return this._proximityChatRoom;
    }

    get userProviderMerger(): Promise<UserProviderMerger> {
        return this._userProviderMergerDeferred.promise;
    }

    get worldUserCounter(): Readable<integer> {
        if (!this.worldUserProvider) {
            throw new Error("this.worldUserProvider not yet initialized");
        }
        return this.worldUserProvider.userCount;
    }

    getStartPositionNames(): string[] {
        return this.startPositionCalculator.getStartPositionNames();
    }

    get sayManager(): SayManager {
        if (!this._sayManager) {
            throw new Error("_sayManager not yet initialized");
        }
        return this._sayManager;
    }

    // Register a callback that will be called when the player movement ends
    public onPlayerMovementEnded(callback: (event: HasPlayerMovedInterface) => void): void {
        this.onPlayerMovementEndedCallbacks.push(callback);
    }
}
