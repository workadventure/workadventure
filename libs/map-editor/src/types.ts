import { z } from "zod";
import type { CreateAreaCommandConfig } from "./Commands/Area/CreateAreaCommand";
import type { DeleteAreaCommandConfig } from "./Commands/Area/DeleteAreaCommand";
import type { UpdateAreaCommandConfig } from "./Commands/Area/UpdateAreaCommand";
import type { CreateEntityCommandConfig } from "./Commands/Entity/CreateEntityCommand";
import type { DeleteEntityCommandConfig } from "./Commands/Entity/DeleteEntityCommand";
import { UpdateEntityCommandConfig } from "./Commands/Entity/UpdateEntityCommand";
import { UpdateWAMSettingCommandConfig } from "./Commands/WAM/UpdateWAMSettingCommand";

export type CommandConfig =
    | UpdateAreaCommandConfig
    | DeleteAreaCommandConfig
    | CreateAreaCommandConfig
    | UpdateEntityCommandConfig
    | CreateEntityCommandConfig
    | DeleteEntityCommandConfig
    | UpdateWAMSettingCommandConfig;

export type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export enum Direction {
    Left = "Left",
    Up = "Up",
    Down = "Down",
    Right = "Right",
}

export const TextHeaderPropertyData = z.string();

export const ActionsMenuData = z.object({
    buttonLabel: z.string().optional(),
    hideButtonLabel: z.boolean().optional(),
});

export const FocusablePropertyData = ActionsMenuData.extend({
    zoom_margin: z.number().optional(),
});

export const JitsiRoomConfigData = z.object({
    startWithAudioMuted: z.boolean().optional(),
    startWithVideoMuted: z.boolean().optional(),
});

export const StartPropertyData = z.boolean();

export const SilentPropertyData = z.boolean();

export const JitsiRoomPropertyData = ActionsMenuData.extend({
    roomName: z.string(),
    jitsiRoomConfig: JitsiRoomConfigData,
});

export const PlayAudioPropertyData = ActionsMenuData.extend({
    audioLink: z.string(),
});

export const OpenWebsitePropertyData = ActionsMenuData.extend({
    link: z.string(),
    newTab: z.boolean().optional(),
});

// TODO: Can they vary between Entity and Area or should it be the same type?
export const AreaDataProperties = z.object({
    start: StartPropertyData.optional().nullable(),
    silent: SilentPropertyData.optional().nullable(),
    focusable: FocusablePropertyData.optional().nullable(),
    jitsiRoom: JitsiRoomPropertyData.optional().nullable(),
    playAudio: PlayAudioPropertyData.optional().nullable(),
    openWebsite: OpenWebsitePropertyData.optional().nullable(),
});

export const AreaData = z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    visible: z.boolean(),
    name: z.string(),
    properties: AreaDataProperties,
});

export const EntityDataProperties = z.object({
    textHeader: TextHeaderPropertyData.optional().nullable(),
    jitsiRoom: JitsiRoomPropertyData.optional().nullable(),
    playAudio: PlayAudioPropertyData.optional().nullable(),
    openWebsite: OpenWebsitePropertyData.optional().nullable(),
});

export const EntityRawPrefab = z.object({
    name: z.string(),
    tags: z.array(z.string()),
    imagePath: z.string(),
    direction: z.enum(["Left", "Up", "Down", "Right"]),
    color: z.string(),
    collisionGrid: z.array(z.array(z.number())).optional(),
    depthOffset: z.number().optional(),
});

export const EntityPrefab = EntityRawPrefab.extend({
    collectionName: z.string(),
    id: z.string(),
});

export const EntityCollection = z.object({
    collectionName: z.string(),
    tags: z.array(z.string()),
    collection: z.array(EntityPrefab),
});

export const EntityData = z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    properties: EntityDataProperties.optional(),
    prefab: EntityPrefab,
});

export const MegaphoneSettings = z.object({
    enabled: z.boolean(),
    title: z.string().optional(),
    scope: z.string().optional(),
    rights: z.array(z.string()).optional(),
});

export type MegaphoneSettings = z.infer<typeof MegaphoneSettings>;

export const WAMFileFormat = z.object({
    version: z.string(),
    mapUrl: z.string(),
    entities: z.array(EntityData),
    areas: z.array(AreaData),
    lastCommandId: z.string().optional(),
    settings: z
        .object({
            megaphone: MegaphoneSettings.optional(),
        })
        .optional(),
});

export type EntityRawPrefab = z.infer<typeof EntityRawPrefab>;
export type EntityPrefab = z.infer<typeof EntityPrefab>;
export type EntityCollection = z.infer<typeof EntityCollection>;
export type EntityData = z.infer<typeof EntityData>;
export type EntityDataProperties = z.infer<typeof EntityDataProperties>;
export type EntityDataPropertiesKeys = keyof z.infer<typeof EntityDataProperties>;
export type AreaData = z.infer<typeof AreaData>;
export type AreaDataProperties = z.infer<typeof AreaDataProperties>;
export type AreaDataPropertiesKeys = keyof z.infer<typeof AreaDataProperties>;
export type TextHeaderPropertyData = z.infer<typeof TextHeaderPropertyData>;
export type ActionsMenuData = z.infer<typeof ActionsMenuData>;
export type StartPropertyData = z.infer<typeof StartPropertyData>;
export type SilentPropertyData = z.infer<typeof SilentPropertyData>;
export type FocusablePropertyData = z.infer<typeof FocusablePropertyData>;
export type JitsiRoomConfigData = z.infer<typeof JitsiRoomConfigData>;
export type JitsiRoomPropertyData = z.infer<typeof JitsiRoomPropertyData>;
export type PlayAudioPropertyData = z.infer<typeof PlayAudioPropertyData>;
export type OpenWebsitePropertyData = z.infer<typeof OpenWebsitePropertyData>;
export type WAMFileFormat = z.infer<typeof WAMFileFormat>;

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
