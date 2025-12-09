import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    //menu: "meni wočinić/začinić",
    calendar: "kalender wočinić/začinić",
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
        pictureInPicture: {
            title: "Wobraz we wobrazu",
            descDisabled:
                "Bohužel tuta funkcija njeje na wašim gratu k dispoziciji ❌. Prošu spytajće druhi grat abo wobhladowak wužiwać, na přikład Chrome abo Edge, zo byšće přistup k tutej funkciji dóstał.",
            desc: "Móžeće funkciju wobraz we wobrazu wužiwać, zo byšće widejo abo prezentaciju woglědowali, mjeztym zo sće w rozmołwje. Klikńće jenož na symbol wobraz we wobrazu a wužiwajće swój wobsah.",
        },
    },
};

export default actionbar;
