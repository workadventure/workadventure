import { z } from "zod";
import { CustomEntityDirection } from "@workadventure/messages";

export type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export enum Direction {
    Left = "Left",
    Up = "Up",
    Down = "Down",
    Right = "Right",
}

export const CollectionUrl = z.object({
    url: z.string(),
    type: z.union([z.literal("file"), z.literal("marketplace")]),
});

export const PropertyBase = z.object({
    id: z.string(),
    buttonLabel: z.string().optional(),
    hideButtonLabel: z.boolean().optional(),
    resourceUrl: z.string().optional(),
    serverData: z.unknown().optional(),
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
    isDefault: z.boolean().optional(),
});

export const ExitPropertyData = PropertyBase.extend({
    type: z.literal("exit"),
    url: z.string(),
    areaName: z.string(),
});

export const JitsiRoomPropertyData = PropertyBase.extend({
    type: z.literal("jitsiRoomProperty"),
    roomName: z.string(),
    jitsiUrl: z.string().optional(),
    closable: z.boolean().optional(),
    trigger: z.union([z.literal("onenter"), z.literal("onaction"), z.literal("onicon")]).optional(),
    triggerMessage: z.string().optional(),
    noPrefix: z.boolean().optional(),
    width: z.number().min(1).max(100).default(50).optional(),
    jitsiRoomAdminTag: z.string().optional(),
    jitsiRoomConfig: JitsiRoomConfigData,
});

export const PlayAudioPropertyData = PropertyBase.extend({
    type: z.literal("playAudio"),
    audioLink: z.string(),
    volume: z.number().default(1).optional(),
    triggerMessage: z.string().optional(),
});

export const OpenWebsitePropertyData = PropertyBase.extend({
    type: z.literal("openWebsite"),
    link: z.string().nullable().default("https://workadventu.re"),
    newTab: z.boolean().optional().default(false),
    closable: z.boolean().optional(),
    allowAPI: z.boolean().optional(),
    trigger: z.union([z.literal("onenter"), z.literal("onaction"), z.literal("onicon")]).optional(),
    triggerMessage: z.string().optional(),
    width: z.number().min(1).max(100).default(50).optional(),
    policy: z
        .string()
        .default("fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture")
        .optional(),
    position: z.number().optional(),
    application: z.string().default("website"),
    poster: z.string().optional(),
    placeholder: z.string().optional(),
    icon: z.string().optional(),
    label: z.string().optional(),
    regexUrl: z.string().optional(),
    targetEmbedableUrl: z.string().optional(),
    forceNewTab: z.boolean().optional().default(false),
});

export const OpenPdfPropertyData = PropertyBase.extend({
    type: z.literal("openPdf"),
    link: z.string().nullable().default("https://workadventu.re"),
    allowAPI: z.boolean().optional(),
    closable: z.boolean().optional(),
    trigger: z.union([z.literal("onenter"), z.literal("onaction"), z.literal("onicon")]).optional(),
    triggerMessage: z.string().optional(),
    policy: z
        .string()
        .default("fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture")
        .optional(),
    width: z.number().min(1).max(100).default(50).optional(),
    position: z.number().optional(),
});

export const ExtensionModuleAreaProperty = PropertyBase.extend({
    type: z.literal("extensionModule"),
    subtype: z.string(),
    data: z.unknown(),
});

export const SpeakerMegaphonePropertyData = PropertyBase.extend({
    type: z.literal("speakerMegaphone"),
    name: z.string(),
    chatEnabled: z.boolean().default(false),
});

export const ListenerMegaphonePropertyData = PropertyBase.extend({
    type: z.literal("listenerMegaphone"),
    speakerZoneName: z.string(),
    chatEnabled: z.boolean().default(false),
});

export const EntityDescriptionPropertyData = PropertyBase.extend({
    type: z.literal("entityDescriptionProperties"),
    description: z.string().optional(),
    searchable: z.boolean().default(false),
});

export const AreaDescriptionPropertyData = PropertyBase.extend({
    type: z.literal("areaDescriptionProperties"),
    description: z.string().optional(),
    searchable: z.boolean().default(false),
});

export const RestrictedRightsPropertyData = PropertyBase.extend({
    type: z.literal("restrictedRightsPropertyData"),
    writeTags: z.array(z.string()).default([]),
    readTags: z.array(z.string()).default([]),
});

export const PersonalAreaAccessClaimMode = z.enum(["dynamic", "static"]);

export const PersonalAreaPropertyData = PropertyBase.extend({
    type: z.literal("personalAreaPropertyData"),
    accessClaimMode: PersonalAreaAccessClaimMode,
    allowedTags: z.array(z.string()).default([]),
    ownerId: z.string().nullable(), //Proto handle null here. If something goes wrong with personal area, this may be the issue
});

export const MatrixRoomPropertyData = PropertyBase.extend({
    type: z.literal("matrixRoomPropertyData"),
    shouldOpenAutomatically: z.boolean(),
    displayName: z.string(),
    serverData: z
        .object({
            matrixRoomId: z.string().optional(),
        })
        .optional(),
});

export const TooltipPropertyData = PropertyBase.extend({
    type: z.literal("tooltipPropertyData"),
    id: z.string(),
    content: z.string(),
    duration: z.number().optional().default(5000),
});
export const AreaDataProperty = z.discriminatedUnion("type", [
    StartPropertyData,
    ExitPropertyData,
    FocusablePropertyData,
    SilentPropertyData,
    JitsiRoomPropertyData,
    PlayAudioPropertyData,
    OpenWebsitePropertyData,
    OpenPdfPropertyData,
    SpeakerMegaphonePropertyData,
    ListenerMegaphonePropertyData,
    AreaDescriptionPropertyData,
    RestrictedRightsPropertyData,
    PersonalAreaPropertyData,
    ExtensionModuleAreaProperty,
    MatrixRoomPropertyData,
    TooltipPropertyData,
]);

export const AreaDataProperties = z.array(AreaDataProperty);

export const AreaCoordinates = z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
});

export const AreaData = AreaCoordinates.extend({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    visible: z.boolean(),
    name: z.string(),
    properties: AreaDataProperties,
});

export const EntityDataProperty = z.discriminatedUnion("type", [
    JitsiRoomPropertyData,
    PlayAudioPropertyData,
    OpenWebsitePropertyData,
    OpenPdfPropertyData,
    EntityDescriptionPropertyData,
]);

export const EntityDataProperties = z.array(EntityDataProperty);

export const CollisionGrid = z.array(z.array(z.number()));

export const EntityRawPrefab = z.object({
    id: z.string(),
    name: z.string(),
    tags: z.array(z.string()),
    imagePath: z.string(),
    direction: z.enum(["Left", "Up", "Down", "Right"]),
    color: z.string(),
    collisionGrid: CollisionGrid.optional(),
    depthOffset: z.number().optional(),
});

export const EntityPrefabType = z.union([z.literal("Default"), z.literal("Custom")]);

export const EntityPrefab = EntityRawPrefab.extend({
    collectionName: z.string(),
    type: EntityPrefabType,
});

export const EntityPrefabRef = z.object({
    collectionName: z.string(),
    id: z.string(),
});

export const EntityCollection = z.object({
    collectionName: z.string(),
    tags: z.array(z.string()),
    collection: z.array(EntityPrefab),
});

export const EntityCollectionRaw = z.object({
    collectionName: z.string(),
    tags: z.array(z.string()),
    collection: z.array(EntityRawPrefab),
    version: z.string().optional(),
});

// TODO: get rid of this type and use only WAMEntityData
export const EntityData = z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    name: z.string().optional(),
    properties: EntityDataProperties.optional(),
    prefab: EntityRawPrefab,
    prefabRef: EntityPrefabRef,
});

export const EntityDimensions = z.object({
    width: z.number(),
    height: z.number(),
});

export const EntityCoordinates = z.object({
    x: z.number(),
    y: z.number(),
});

export const WAMEntityData = EntityData.omit({ prefab: true, id: true });
export type WAMEntityData = z.infer<typeof WAMEntityData>;

export const WAMMetadata = z.object({
    name: z.string().optional().nullable().describe("The name of the map."),
    description: z
        .string()
        .optional()
        .nullable()
        .describe("A description of the map. Can be used in social networks when sharing a link to the map."),
    copyright: z
        .string()
        .optional()
        .nullable()
        .describe(
            "Copyright notice for this map. Can be a link to a license. Parts of this map like tilesets or images can have their own copyright."
        ),
    thumbnail: z
        .string()
        .optional()
        .nullable()
        .describe(
            "URL to a thumbnail image. This image will be used in social networks when sharing a link to the map."
        ),
    areasSearchable: z
        .number()
        .optional()
        .nullable()
        .describe("Number of areas define as searchable by the map editor for the exploration mode."),
    entitiesSearchable: z
        .number()
        .optional()
        .nullable()
        .describe("Number of entities define as searchable by the map editor for the exploration mode."),
});
export type WAMMetadata = z.infer<typeof WAMMetadata>;

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

export const WAMSettings = z.object({
    megaphone: MegaphoneSettings.optional(),
});

export const WAMFileFormat = z.object({
    version: z.string(),
    mapUrl: z.string(),
    entities: z.record(z.string(), WAMEntityData),
    areas: z.array(AreaData),
    entityCollections: z.array(CollectionUrl),
    lastCommandId: z.string().optional(),
    settings: WAMSettings.optional(),
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
export type EntityPrefabType = z.infer<typeof EntityPrefabType>;
export type EntityCollection = z.infer<typeof EntityCollection>;
export type EntityCollectionRaw = z.infer<typeof EntityCollectionRaw>;
export type CollectionUrl = z.infer<typeof CollectionUrl>;
export type CollisionGrid = z.infer<typeof CollisionGrid>;
export type EntityData = z.infer<typeof EntityData>;
export type EntityDimensions = z.infer<typeof EntityDimensions>;
export type EntityCoordinates = z.infer<typeof EntityCoordinates>;
export type EntityDataProperties = z.infer<typeof EntityDataProperties>;
export type EntityDataProperty = z.infer<typeof EntityDataProperty>;
export type EntityDataPropertiesKeys = "jitsiRoomProperty" | "playAudio" | "openWebsite" | "openPdf";
export type AreaCoordinates = z.infer<typeof AreaCoordinates>;
export type AreaData = z.infer<typeof AreaData>;
export type AreaDataProperties = z.infer<typeof AreaDataProperties>;
export type AreaDataProperty = z.infer<typeof AreaDataProperty>;
export type AreaDataPropertiesKeys = AreaDataProperty["type"];
export type ActionsMenuData = z.infer<typeof PropertyBase>;
export type ExitPropertyData = z.infer<typeof ExitPropertyData>;
export type StartPropertyData = z.infer<typeof StartPropertyData>;
export type SilentPropertyData = z.infer<typeof SilentPropertyData>;
export type FocusablePropertyData = z.infer<typeof FocusablePropertyData>;
export type JitsiRoomConfigData = z.infer<typeof JitsiRoomConfigData>;
export type JitsiRoomPropertyData = z.infer<typeof JitsiRoomPropertyData>;
export type PlayAudioPropertyData = z.infer<typeof PlayAudioPropertyData>;
export type OpenWebsitePropertyData = z.infer<typeof OpenWebsitePropertyData>;
export type OpenPdfPropertyData = z.infer<typeof OpenPdfPropertyData>;
export type WAMSettings = z.infer<typeof WAMSettings>;
export type WAMFileFormat = z.infer<typeof WAMFileFormat>;
export type MapsCacheSingleMapFormat = z.infer<typeof MapsCacheSingleMapFormat>;
export type MapsCacheFileFormat = z.infer<typeof MapsCacheFileFormat>;
export type SpeakerMegaphonePropertyData = z.infer<typeof SpeakerMegaphonePropertyData>;
export type ListenerMegaphonePropertyData = z.infer<typeof ListenerMegaphonePropertyData>;
export type EntityDescriptionPropertyData = z.infer<typeof EntityDescriptionPropertyData>;
export type AreaDescriptionPropertyData = z.infer<typeof AreaDescriptionPropertyData>;
export type RestrictedRightsPropertyData = z.infer<typeof RestrictedRightsPropertyData>;
export type PersonalAreaPropertyData = z.infer<typeof PersonalAreaPropertyData>;
export type MatrixRoomPropertyData = z.infer<typeof MatrixRoomPropertyData>;
export type PersonalAreaAccessClaimMode = z.infer<typeof PersonalAreaAccessClaimMode>;
export type ExtensionModuleAreaPropertyData = z.infer<typeof ExtensionModuleAreaProperty>;
export type TooltipPropertyData = z.infer<typeof TooltipPropertyData>;

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
    JITSI_CLOSABLE = "jitsiClosable",
    LISTENER_MEGAPHONE = "listenerMegaphone",
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
    SPEAKER_MEGAPHONE = "speakerMegaphone",
    START = "start",
    START_LAYER = "startLayer",
    URL = "url",
    WRITABLE_BY = "writableBy",
    ZONE = "zone",
    ZOOM_MARGIN = "zoomMargin",
}

export const mapCustomEntityDirectionToDirection = (uploadEntityMessageDirection: CustomEntityDirection) => {
    switch (uploadEntityMessageDirection) {
        case CustomEntityDirection.Up:
            return Direction.Up;
        case CustomEntityDirection.Right:
            return Direction.Right;
        case CustomEntityDirection.Down:
            return Direction.Down;
        case CustomEntityDirection.Left:
            return Direction.Left;
        default:
            return Direction.Down;
    }
};
