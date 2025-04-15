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
export const ON_ICON_TRIGGER_BUTTON = "onicon";
export const ON_ACTION_TRIGGER_ENTER = "onenter";

export type Box = { xStart: number; yStart: number; xEnd: number; yEnd: number };
