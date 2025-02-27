import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    //menu: "meni wočinić/začinić",
    calendar: "kalender wočinić/začinić",
    bo: "pozadkowy běrow wočinić",
    subtitle: {
        microphone: "mikrofon",
        speaker: "wótřerěčak",
    },
    help: {
        chat: {
            title: "chat wočinić/začinić",
        },
        emoji: {
            title: "emojijowy meni wočinić/začinić",
        },
        follow: {
            title: "sćěhować",
        },
        unfollow: {
            title: "nic wjac sćěhować",
        },
        lock: {
            title: "diskusiju zawrěć/wotewrić",
        },
        mic: {
            title: "něme šaltowanje startować/skónčić",
        },
        cam: {
            title: "kameru startować/skónčić",
        },
        share: {
            title: "přenošowanje wobrazowki startować/skónčić",
        },
    },
};

export default actionbar;
