import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    chat: "chat wočinić/začinić",
    follow: "sćěhować",
    unfollow: "nic wjac sćěhować",
    lock: "diskusiju zawrěć/wotewrić",
    screensharing: "přenošowanje wobrazowki startować/skónčić",
    layout: "napohlad kachlow přešaltować",
    camera: "kameru startować/skónčić",
    microphone: "něme šaltowanje startować/skónčić",
    emoji: "emojijowy meni wočinić/začinić",
    menu: "meni wočinić/začinić",
    calendar: "kalender wočinić/začinić",
    bo: "pozadkowy běrow wočinić",
    subtitle: {
        microphone: "mikrofon",
        speaker: "wótřerěčak",
    },
};

export default actionbar;
