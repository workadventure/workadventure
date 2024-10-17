import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    chat: "Open / Close chat",
    follow: "Follow",
    unfollow: "Unfollow",
    lock: "Lock / Unlock discussion",
    screensharing: "Start / Stop sharing your screen",
    layout: "Toggle tile view",
    camera: "Start / Stop camera",
    microphone: "Mute / Unmute",
    emoji: "Open / Close emoji",
    menu: "Open / Close menu",
    bo: "Open back office",
    subtitle: {
        microphone: "Microphone",
        speaker: "Speaker",
    },
};

export default actionbar;
