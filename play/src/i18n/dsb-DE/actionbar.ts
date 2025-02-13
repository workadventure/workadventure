import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    //layout: "Kachlowy naglěd aktiwěrowaś/deaktiwěrowaś",
    //menu: "Menij wótcyniś / zacyniś",
    calendar: "Kalender wótcyniś / zacyniś",
    mapEditor: "Editor kórty wótcyniś / zacyniś",
    bo: "Běrow we slězynje wótcyniś / zacyniś",
    subtitle: {
        microphone: "Mikrofon",
        speaker: "Głosniki",
    },
    help: {
        chat: {
            title: "Chat wótcyniś / zacyniś",
        },
        follow: {
            title: "Folgen",
        },
        unfollow: {
            title: "Entfolgen",
        },
        lock: {
            title: "Diskusiju blokěrowaś / naspjet aktiwěrowaś",
        },
        share: {
            title: "Pśenosowanje wobrazowki aktiwěrowaś/deaktiwěrowaś",
        },
        mic: {
            title: "Mikrofon aktiwěrowaś/deaktiwěrowaś",
        },
        cam: {
            title: "Kameru startowaś / zastajiś",
        },
        emoji: {
            title: "Emojije wótcyniś / zacyniś",
        },
    },
};

export default actionbar;
