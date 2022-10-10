import { ITiledMapObject } from "@workadventure/tiled-map-type-guard";
import { CreateAreaCommandConfig } from './Commands/Area/CreateAreaCommand';
import { DeleteAreaCommandConfig } from './Commands/Area/DeleteAreaCommand';
import { UpdateAreaCommandConfig } from './Commands/Area/UpdateAreaCommand';

export type ITiledMapRectangleObject = ITiledMapObject & { width: number; height: number };

export type CommandConfig =
    UpdateAreaCommandConfig |
    DeleteAreaCommandConfig |
    CreateAreaCommandConfig;

export interface AreaData {
    id: number;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    properties: AreaProperties;
}

// NOTE: This is the same type as declared in messages.proto. any way so we can use one from proto instead of duplicating it?
export interface AreaProperties {
    focusable?: boolean;
    zoomMargin?: number;
    silent?: boolean;
    customProperties: Record<string, any>;
};

export enum AreaType {
    Static = "Static",
    Dynamic = "Dynamic",
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
