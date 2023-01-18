import type { ModifyAreaMessage } from "@workadventure/messages";
import type { CreateAreaCommandConfig } from "./Commands/Area/CreateAreaCommand";
import type { DeleteAreaCommandConfig } from "./Commands/Area/DeleteAreaCommand";
import type { UpdateAreaCommandConfig } from "./Commands/Area/UpdateAreaCommand";
import type { CreateEntityCommandConfig } from "./Commands/Entity/CreateEntityCommand";
import type { DeleteEntityCommandConfig } from "./Commands/Entity/DeleteEntityCommand";
import { UpdateEntityCommandConfig } from "./Commands/Entity/UpdateEntityCommand";
import { z } from "zod";

export type CommandConfig =
    | UpdateAreaCommandConfig
    | DeleteAreaCommandConfig
    | CreateAreaCommandConfig
    | UpdateEntityCommandConfig
    | CreateEntityCommandConfig
    | DeleteEntityCommandConfig;

export type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export type AreaData = Required<ModifyAreaMessage> & { visible: boolean }; // move visible to messages also

export enum AreaType {
    Static = "Static",
    Dynamic = "Dynamic",
}

export enum Direction {
    Left = "Left",
    Up = "Up",
    Down = "Down",
    Right = "Right",
}

export const isEntityRawPrefab = z.object({
    name: z.string(),
    tags: z.array(z.string()),
    imagePath: z.string(),
    direction: z.enum(["Left", "Up", "Down", "Right"]),
    color: z.string(),
    collisionGrid: z.array(z.array(z.number())).optional(),
});

export const isEntityPrefab = isEntityRawPrefab.extend({
    collectionName: z.string(),
    id: z.string(),
});

export const isEntityCollection = z.object({
    collectionName: z.string(),
    tags: z.array(z.string()),
    collection: z.array(isEntityPrefab),
});

export const isEntityData = z.object({
    id: z.number(),
    x: z.number(),
    y: z.number(),
    properties: z.record(z.unknown().optional()).optional(),
    prefab: isEntityPrefab,
});

export type EntityRawPrefab = z.infer<typeof isEntityRawPrefab>;
export type EntityPrefab = z.infer<typeof isEntityPrefab>;
export type EntityCollection = z.infer<typeof isEntityCollection>;
export type EntityData = z.infer<typeof isEntityData>;

export interface PredefinedPropertyData {
    name: string;
    description: string;
    turnedOn: boolean;
    additionalProperties: Record<string, string | number | boolean | object | undefined>;
}

export interface ActionsMenuData {
    buttonLabel: string;
}

export interface JitsiRoomPropertyData extends ActionsMenuData {
    roomName: string;
    jitsiRoomConfig: JitsiRoomConfigData;
}

export interface JitsiRoomConfigData {
    startWithAudioMuted?: boolean;
    startWithVideoMuted?: boolean;
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

// export interface EntityCollection {
//     collectionName: string;
//     tags: string[];
//     collection: EntityPrefab[];
// }
// export interface EntityData {
//     id: number;
//     x: number;
//     y: number;
//     properties?: { [key: string]: unknown | undefined };
//     prefab: EntityPrefab;
// }
// export interface EntityRawPrefab {
//     name: string;
//     tags: string[];
//     imagePath: string;
//     direction: Direction;
//     color: string;
//     collisionGrid?: number[][];
// }

// export interface EntityPrefab extends EntityRawPrefab {
//     collectionName: string;
//     id: string;
// }
