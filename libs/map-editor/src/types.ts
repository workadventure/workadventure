import type { ModifyAreaMessage } from "@workadventure/messages";
import type { CreateAreaCommandConfig } from './Commands/Area/CreateAreaCommand';
import type { DeleteAreaCommandConfig } from './Commands/Area/DeleteAreaCommand';
import type { UpdateAreaCommandConfig } from './Commands/Area/UpdateAreaCommand';
import type { CreateEntityCommandConfig } from './Commands/Entity/CreateEntityCommand';
import type { DeleteEntityCommandConfig } from './Commands/Entity/DeleteEntityCommand';


export type CommandConfig =
    UpdateAreaCommandConfig |
    DeleteAreaCommandConfig |
    CreateAreaCommandConfig |
    CreateEntityCommandConfig |
    DeleteEntityCommandConfig;

export type AreaData = Required<ModifyAreaMessage> & { visible: boolean }; // move visible to messages also

export enum AreaType {
    Static = "Static",
    Dynamic = "Dynamic",
}

export enum Direction {
    Left = "Left",
    Up = "Up",
    Down = "Down",
    Right = "Right"
}

export interface EntityCollection {
    collectionName: string;
    tags: string[];
    collection: EntityPrefab[];
}
export interface EntityData {
    id: number;
    x: number;
    y: number;
    interactive?: boolean;
    properties?: { [key: string]: unknown | undefined };
    prefab: EntityPrefab;
}
export interface EntityRawPrefab {
    name: string;
    tags: string[];
    imagePath: string;
    direction: Direction;
    color: string;
    collisionGrid?: number[][];
}

export interface EntityPrefab extends EntityRawPrefab {
    collectionName: string;
    id: string;
}

export interface PredefinedPropertyData {
    name: string;
    description: string;
    turnedOn: boolean;
    additionalProperties: Record<string, string | number | boolean | {} | undefined>;
}

export interface ActionsMenuData {
    buttonLabel: string;
}

export interface JitsiRoomPropertyData extends ActionsMenuData {
    roomName: string;
}
export interface PlayAudioPropertyData extends ActionsMenuData {
    audioLink: string;
}
export interface OpenTabPropertyData extends ActionsMenuData {
    link: string;
    inNewTab: boolean;
}

export enum GameMapProperties {
    ALLOW_API = "allowApi",
    AUDIO_LOOP = "audioLoop",
    AUDIO_VOLUME = "audioVolume",
    BBB_MEETING = "bbbMeeting",
    CHAT_NAME = "chatName",
    COLLIDES = "collides",
    DEFAULT = "default",
    EXIT_URL = "exitUrl",
    EXIT_SCENE_URL = "exitSceneUrl",
    FONT_FAMILY = "font-family",
    FOCUSABLE = "focusable",
    JITSI_ADMIN_ROOM_TAG = "jitsiRoomAdminTag",
    JITSI_CONFIG = "jitsiConfig",
    JITSI_INTERFACE_CONFIG = "jitsiInterfaceConfig",
    JITSI_ROOM = "jitsiRoom",
    JITSI_TRIGGER = "jitsiTrigger",
    JITSI_TRIGGER_MESSAGE = "jitsiTriggerMessage",
    JITSI_URL = "jitsiUrl",
    JITSI_WIDTH = "jitsiWidth",
    JITSI_NO_PREFIX = "jitsiNoPrefix",
    NAME = "name",
    OPEN_TAB = "openTab",
    OPEN_WEBSITE = "openWebsite",
    OPEN_WEBSITE_ALLOW_API = "openWebsiteAllowApi",
    OPEN_WEBSITE_POLICY = "openWebsitePolicy",
    OPEN_WEBSITE_WIDTH = "openWebsiteWidth",
    OPEN_WEBSITE_POSITION = "openWebsitePosition",
    OPEN_WEBSITE_CLOSABLE = "openWebsiteClosable",
    OPEN_WEBSITE_TRIGGER = "openWebsiteTrigger",
    OPEN_WEBSITE_TRIGGER_MESSAGE = "openWebsiteTriggerMessage",
    PLAY_AUDIO = "playAudio",
    PLAY_AUDIO_LOOP = "playAudioLoop",
    POLICY = "policy",
    READABLE_BY = "readableBy",
    SCRIPT = "script",
    SCRIPT_DISABLE_MODULE_SUPPORT = "scriptDisableModuleSupport",
    SILENT = "silent",
    START = "start",
    START_LAYER = "startLayer",
    URL = "url",
    WRITABLE_BY = "writableBy",
    ZONE = "zone",
    ZOOM_MARGIN = "zoomMargin",
}
