import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    announcement: {
        title: "Připowědźenje pósłać",
        audience: "Štó jo dóstanje?",
        thisRoom: "Tuta stwa",
        wholeWorld: "Cyły swět",
        place: "Městno (na přeće)",
        noPlace: "Žane městno",
        noPlaceOnMap: "Tuta karta hišće nima pomjenowany wobłuk.",
        preview: "Přehlad",
        sendToRoom: "Do tuteje stwy pósłać",
        sendToWorld: "Do cyłeho swěta pósłać",
        confirmWorld: "Wšě stwy swěta jo dóstanu.",
        confirmSend: "Haj, do cyłeho swěta pósłać",
        cancel: "Přetorhnyć",
        sentToRoom: "Připowědźenje do tuteje stwy pósłane",
        sentToWorld: "Připowědźenje do cyłeho swěta pósłane",
        join: "K {place}",
        joinMap: "Hić",
        placeNotFound: "Tute městno hižo njeeksistuje na karće.",
        admin: "Administrator",
        more: "Čakace připowědźenja: {count}",
    },
    modal: {
        liveMessage: {
            startMegaphone: "Megafon startować",
            stopMegaphone: "Megafon zastajić",
            goingToStream: "Budźeće streamować",
            yourMicrophone: "waš mikrofon",
            yourCamera: "wašu kameru",
            yourScreen: "wašu wobrazowku",
            title: "Megafon",
            and: "a",
            toAll: "na wšěch wobdźělnikow",
            settings: "Nastajenja",
        },
    },
};

export default megaphone;
