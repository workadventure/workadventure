import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    announcement: {
        title: "Pśipowěsć pósłaś",
        audience: "Chto ju dostanjo?",
        thisRoom: "Toś ta śpa",
        wholeWorld: "Ceły swět",
        place: "Městno (na žycenje)",
        noPlace: "Žedno městno",
        noPlaceOnMap: "Toś ta karta hyšći njama mjenjony wobcerk.",
        preview: "Pśeglěd",
        sendToRoom: "Do toś teje śpy pósłaś",
        sendToWorld: "Do cełego swěta pósłaś",
        confirmWorld: "Wšykne śpy swěta ju dostanu.",
        confirmSend: "Jo, do cełego swěta pósłaś",
        cancel: "Pśetergnuś",
        sentToRoom: "Pśipowěsć do toś teje śpy pósłana",
        sentToWorld: "Pśipowěsć do cełego swěta pósłana",
        join: "K {place}",
        joinMap: "Hyś",
        placeNotFound: "Toś to městno južo njeeksistěrujo na karśe.",
        admin: "Administrator",
        more: "Cakajuce pśipowěsći: {count}",
    },
    modal: {
        liveMessage: {
            microphoneOff: "Mikrofon wótšaltowany",
            cameraOff: "Kamera wótšaltowana",
            cameraOffHint: "Móžoš teke jano z mikrofonom live hyś.",
            devices: "Kamera a mikrofon",
            whoHears: "Chto śi słyšy?",
            thisRoom: "Toś ta śpa",
            wholeWorld: "Wšykne śpy swěta",
            live: "Live",
            stop: "Zastajiś",
            title: "Megafon",
        },
    },
};

export default megaphone;
