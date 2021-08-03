export enum LayoutMode {
    // All videos are displayed on the right side of the screen. If there is a screen sharing, it is displayed in the middle.
    Presentation = "Presentation",
    // Videos take the whole page.
    VideoChat = "VideoChat",
}

export enum DivImportance {
    // For screen sharing
    Important = "Important",
    // For normal video
    Normal = "Normal",
}

export const ON_ACTION_TRIGGER_BUTTON = "onaction";

export const TRIGGER_WEBSITE_PROPERTIES = "openWebsiteTrigger";
export const TRIGGER_JITSI_PROPERTIES = "jitsiTrigger";

export const WEBSITE_MESSAGE_PROPERTIES = "openWebsiteTriggerMessage";
export const JITSI_MESSAGE_PROPERTIES = "jitsiTriggerMessage";

export const AUDIO_VOLUME_PROPERTY = "audioVolume";
export const AUDIO_LOOP_PROPERTY = "audioLoop";

export type Box = { xStart: number; yStart: number; xEnd: number; yEnd: number };
