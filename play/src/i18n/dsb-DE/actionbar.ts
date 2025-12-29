import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    //layout: "Kachlowy naglěd aktiwěrowaś/deaktiwěrowaś",
    //menu: "Menij wótcyniś / zacyniś",
    calendar: "Kalender wótcyniś / zacyniś",
    mapEditor: "Editor kórty wótcyniś / zacyniś",
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
        audioManager: {
            title: "Głośnosć wokolnych zwukow",
            desc: "Konfigurěrujśo awdijowu głośnosć, kliknjo how.",
            pause: "Klikniśo how, aby awdijo zastajił",
            play: "Klikniśo how, aby awdijo wótgrał",
            stop: "Klikniśo how, aby awdijo zastajił",
        },
        audioManagerNotAllowed: {
            title: "Wokolne zwuki zablokěrowane",
            desc: "Waš browser jo wokolne zwuki wótraś zawoborał. Klikniśo na symbol, aby wótgraśe startował.",
        },
        pictureInPicture: {
            title: "Wobraz we wobrazu",
            descDisabled:
                "Bóžko toś ta funkcija njejo na wašom rěźe k dispoziciji ❌. Pšosym wopytajśo drugi rěd abo browser wužywaś, na pśikład Chrome abo Edge, aby pśistup k toś tej funkciji dostał.",
            desc: "Móžośo funkciju wobraz we wobrazu wužywaś, aby wideo abo pśedstajenje woglědali, mjaztym až sćo w rozgronje. Klikniśo jadnorje na symbol wobraz we wobrazu a wužywajśo swój wopśimjeś.",
        },
    },
    personalDesk: {
        label: "K mójomu pisanjejomu blidkoju",
        unclaim: "Mójo pisanje blidko wótpóraś",
        errorNoUser: "Wužywarske informacije njejsu se namakali",
        errorNotFound: "Njamajo hyšći wósobinske pisanje blidko",
        errorMoving: "Wósobinske pisanje blidko njejo se docyło",
        errorUnclaiming: "Wósobinske pisanje blidko njejo se wótpórało",
    },
};

export default actionbar;
