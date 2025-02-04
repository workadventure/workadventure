import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    //layout: "Tegelweergave schakelen",
    //disableLayout: "Niet beschikbaar als er slechts één persoon in de vergadering is",
    //disableMegaphone: "Schakel megafoon uit",
    //menu: "Openen / Sluiten menu",
    calendar: "Openen / Sluiten kalender",
    mapEditor: "Openen / Sluiten kaartbeheerder",
    mapEditorMobileLocked: "Kaarteditor is vergrendeld in mobiele modus",
    mapEditorLocked: "Kaarteditor is vergrendeld 🔐",
    bo: "Openen backoffice",
    subtitle: {
        microphone: "Microfoon",
        speaker: "Luidspreker",
    },
    app: "Openen / Sluiten applicaties",
    listStatusTitle: {
        enable: "Wijzig je status",
    },

    status: {
        ONLINE: "Online",
        BACK_IN_A_MOMENT: "Zo terug",
        DO_NOT_DISTURB: "Niet storen",
        BUSY: "Bezet",
    },
    globalMessage: "Stuur een globale boodschap",
    //roomList: "Openen / Sluiten kamer lijst",
    help: {
        mic: {
            title: "Dempen / Dempen opheffen",
        },
        cam: {
            title: "Camera starten / stoppen",
        },
        chat: {
            title: "Openen / Sluiten chat",
        },
        follow: {
            title: "Volgen",
        },
        unfollow: {
            title: "Ontvolgen",
        },
        lock: {
            title: "Vergrendel / Ontgrendel discussie",
        },
        share: {
            title: "Starten / Stoppen met scherm delen",
        },
        emoji: {
            title: "Openen / Sluiten emoji",
        },
    },
};

export default actionbar;
