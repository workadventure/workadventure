import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const warning: DeepPartial<Translation["warning"]> = {
    title: "Waarschuwing!",
    content: `Deze wereld nadert zijn limiet! Je kunt de capaciteit upgraden <a href="{upgradeLink}" target="_blank">hier</a>`,
    limit: "Deze wereld nadert zijn limiet!",
    accessDenied: {
        camera: "Camera toegang geweigerd. Klik hier en controleer je browserrechten.",
        screenSharing: "Scherm delen geweigerd. Klik hier en controleer je browserrechten.",
        teleport: "Je hebt geen recht om naar deze gebruiker te teleporteren.",
        room: "Toegang tot de kamer geweigerd. Je mag deze kamer niet betreden.",
    },
    importantMessage: "Belangrijke boodschap",
    connectionLost: "Verbinding verloren. Herverbinden...",
    connectionLostTitle: "Verbinding verloren",
    connectionLostSubtitle: "Herverbinden",
    waitingConnectionTitle: "Wachten op verbinding",
    waitingConnectionSubtitle: "Verbinden",
    megaphoneNeeds: "Om de megaphone te gebruiken, moet je je camera of je microfoon inschakelen of je scherm delen.",
    mapEditorShortCut: "Er is een fout opgetreden bij het openen van de kaarteditor.",
    mapEditorNotEnabled: "De kaarteditor is niet ingeschakeld op deze wereld.",
    popupBlocked: {
        title: "Popup geblokkeerd",
        content: "Sta popups toe voor deze website in je browserinstellingen.",
        done: "Ok",
    },
};

export default warning;
