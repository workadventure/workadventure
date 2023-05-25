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

export const PropertyBase = z.object({
    id: z.string(),
    buttonLabel: z.string().optional(),
    hideButtonLabel: z.boolean().optional(),
});

export const FocusablePropertyData = PropertyBase.extend({
    type: z.literal("focusable"),
    zoom_margin: z.number().optional(),
});

export const JitsiRoomConfigData = z.object({
    startWithAudioMuted: z.boolean().optional(),
    startWithVideoMuted: z.boolean().optional(),
});

export const SilentPropertyData = PropertyBase.extend({
    type: z.literal("silent"),
});

export const StartPropertyData = PropertyBase.extend({
    type: z.literal("start"),
});

export const JitsiRoomPropertyData = PropertyBase.extend({
    type: z.literal("jitsiRoomProperty"),
    roomName: z.string(),
    jitsiUrl: z.string().optional(),
    closable: z.boolean().optional(),
    trigger: z.union([z.literal("onaction"), z.literal("onicon")]).optional(),
    triggerMessage: z.string().optional(),
    noPrefix: z.boolean().optional(),
    jitsiRoomConfig: JitsiRoomConfigData,
});

export const PlayAudioPropertyData = PropertyBase.extend({
    type: z.literal("playAudio"),
    audioLink: z.string(),
    volume: z.number().default(1).optional(),
});

export const OpenWebsitePropertyData = PropertyBase.extend({
    type: z.literal("openWebsite"),
    link: z.string().default("https://workadventu.re"),
    newTab: z.boolean().optional().default(false),
    closable: z.boolean().optional(),
    allowAPI: z.boolean().optional(),
    trigger: z.union([z.literal("onaction"), z.literal("onicon")]).optional(),
    triggerMessage: z.string().optional(),
    width: z.number().default(50).optional(),
    policy: z
        .string()
        .default("fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture")
        .optional(),
    position: z.number().optional(),
});

export const AreaDataProperty = z.union([
    StartPropertyData,
    FocusablePropertyData,
    SilentPropertyData,
    JitsiRoomPropertyData,
    PlayAudioPropertyData,
    OpenWebsitePropertyData,
]);

export const AreaDataProperties = z.array(AreaDataProperty);

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

export const EntityDataProperty = z.union([JitsiRoomPropertyData, PlayAudioPropertyData, OpenWebsitePropertyData]);

export const EntityDataProperties = z.array(EntityDataProperty);

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
    name: z.string().optional(),
    properties: EntityDataProperties.optional(),
    prefab: EntityPrefab,
});

export const WAMMetadata = z.object({
    name: z.string().optional().describe("The name of the map."),
    description: z
        .string()
        .optional()
        .describe("A description of the map. Can be used in social networks when sharing a link to the map."),
    copyright: z
        .string()
        .optional()
        .describe(
            "Copyright notice for this map. Can be a link to a license. Parts of this map like tilesets or images can have their own copyright."
        ),
    thumbnail: z
        .string()
        .optional()
        .describe(
            "URL to a thumbnail image. This image will be used in social networks when sharing a link to the map."
        ),
});

export const WAMVendor = z
    .unknown()
    .describe(
        "Use this field to store data that is not handled directly by WorkAdventure. " +
            "This is a good place to store data generated by an admin (like access rights)"
    );

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
    entityCollections: z.array(z.string()),
    lastCommandId: z.string().optional(),
    settings: z
        .object({
            megaphone: MegaphoneSettings.optional(),
        })
        .optional(),
    metadata: WAMMetadata.optional().describe("Contains metadata about the map (name, description, copyright, etc.)"),
    vendor: WAMVendor.optional(),
});

export const MapsCacheSingleMapFormat = z.object({
    mapUrl: z.string(),
    metadata: WAMMetadata.optional(),
    vendor: WAMVendor.optional(),
});
export const MapsCacheFileFormat = z.object({
    version: z.string(),
    maps: z
        .record(z.string(), MapsCacheSingleMapFormat)
        .describe("The format of the output of the /maps API call on the map-storage container."),
});

export type EntityRawPrefab = z.infer<typeof EntityRawPrefab>;
export type EntityPrefab = z.infer<typeof EntityPrefab>;
export type EntityCollection = z.infer<typeof EntityCollection>;
export type EntityData = z.infer<typeof EntityData>;
export type EntityDataProperties = z.infer<typeof EntityDataProperties>;
export type EntityDataProperty = z.infer<typeof EntityDataProperty>;
export type EntityDataPropertiesKeys = "jitsiRoomProperty" | "playAudio" | "openWebsite";
export type AreaData = z.infer<typeof AreaData>;
export type AreaDataProperties = z.infer<typeof AreaDataProperties>;
export type AreaDataProperty = z.infer<typeof AreaDataProperty>;
export type AreaDataPropertiesKeys = AreaDataProperty["type"];
export type ActionsMenuData = z.infer<typeof PropertyBase>;
export type StartPropertyData = z.infer<typeof StartPropertyData>;
export type SilentPropertyData = z.infer<typeof SilentPropertyData>;
export type FocusablePropertyData = z.infer<typeof FocusablePropertyData>;
export type JitsiRoomConfigData = z.infer<typeof JitsiRoomConfigData>;
export type JitsiRoomPropertyData = z.infer<typeof JitsiRoomPropertyData>;
export type PlayAudioPropertyData = z.infer<typeof PlayAudioPropertyData>;
export type OpenWebsitePropertyData = z.infer<typeof OpenWebsitePropertyData>;
export type WAMFileFormat = z.infer<typeof WAMFileFormat>;
export type MapsCacheSingleMapFormat = z.infer<typeof MapsCacheSingleMapFormat>;
export type MapsCacheFileFormat = z.infer<typeof MapsCacheFileFormat>;

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
