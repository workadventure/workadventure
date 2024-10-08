import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    chat: "Open / Close chat",
    follow: "Follow",
    unfollow: "Unfollow",
    lock: "Lock / Unlock discussion",
    screensharing: "Start / Stop sharing your screen",
    layout: "Toggle tile view",
    disableLayout: "Not available if only one person in the meeting",
    camera: "Start / Stop camera",
    microphone: "Mute / Unmute",
    emoji: "Open / Close emoji",
    disableMegaphone: "Mute megaphone",
    menu: "Open / Close menu",
    calendar: "Open / Close calendar",
    mapEditor: "Open / Close map editor",
    mapEditorMobileLocked: "Map editor is locked in mobile mode",
    mapEditorLocked: "Map editor is locked 🔐",
    bo: "Open back office",
    subtitle: {
        microphone: "Microphone",
        speaker: "Speaker",
    },
    app: "Open / Close applications",
    globalMessage: "Send global message",
    roomList: "Open / Close room list",
};

export default actionbar;
