import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const warning: DeepPartial<Translation["warning"]> = {
    title: "Warnung!",
    content: `Diese Welt ist nah an ihrer Kapazitätsgrenze! Du kannst ihre Kapazität <a href="{upgradeLink}" target="_blank">hier</a> erhöhen.`,
    limit: "Diese Welt ist nah an ihrer Kapazitätsgrenze!",
    accessDenied: {
        camera: "Kamerazugriff verweigert. Klicke hier und überprüfe die Berechtigungen deines Browsers.",
        screenSharing: "Bildschirmfreigabe verweigert. Klicke hier und überprüfe die Berechtigungen deines Browsers.",
        teleport: "Dir fehlt die Berechtigung, um zu diesem Benutzer zu teleportieren.",
        room: "Zutritt nicht gestattet. Dir fehlt die Berechtigung, um diesen Raum zu betreten.",
    },
    importantMessage: "Wichtige Nachricht",
    connectionLost: "Verbindung verloren. Verbindung wird wiederhergestellt...",
    connectionLostTitle: "Verbindung verloren",
    connectionLostSubtitle: "Verbindung wiederherstellen",
    waitingConnectionTitle: "Warten auf Verbindung",
    waitingConnectionSubtitle: "Verbinden",
    megaphoneNeeds:
        "Um das Megaphon zu benutzen, musst du deine Kamera oder dein Mikrofon aktivieren oder deinen Bildschirm freigeben.",
    mapEditorShortCut: "Beim Versuch, den Karteneditor zu öffnen, ist ein Fehler aufgetreten.",
    mapEditorNotEnabled: "Der Karteneditor ist in dieser Welt nicht aktiviert.",
    popupBlocked: {
        title: "Popup blockiert",
        content: "Bitte erlaube Popups für diese Website in deinen Browsereinstellungen.",
        done: "Ok",
    },
    backgroundProcessing: {
        failedToApply: "Hintergrundeffekte konnten nicht angewendet werden",
    },
    browserNotSupported: {
        title: "😢 Browser wird nicht unterstützt",
        message: "Ihr Browser ({browserName}) wird von WorkAdventure nicht mehr unterstützt.",
        description:
            "Ihr Browser ist zu alt, um WorkAdventure auszuführen. Bitte aktualisieren Sie ihn auf die neueste Version, um fortzufahren.",
        whatToDo: "Was können Sie tun?",
        option1: "{browserName} auf die neueste Version aktualisieren",
        option2: "WorkAdventure verlassen und einen anderen Browser verwenden",
        updateBrowser: "Browser aktualisieren",
        leave: "Verlassen",
    },
    pwaInstall: {
        title: "WorkAdventure installieren",
        description:
            "Installieren Sie die App für ein besseres Erlebnis: schnelleres Laden, schneller Zugriff und App-ähnliche Nutzung.",
        descriptionIos:
            "Fügen Sie WorkAdventure zum Home-Bildschirm hinzu für ein besseres Erlebnis und schnellen Zugriff.",
        iosStepsTitle: "So installieren Sie",
        iosStep1: "Tippen Sie auf die Teilen-Schaltfläche (Quadrat mit Pfeil) unten in Safari.",
        iosStep2: "Scrollen Sie nach unten und tippen Sie auf „Zum Home-Bildschirm“.",
        iosStep3: "Tippen Sie auf „Hinzufügen“, um zu bestätigen.",
        install: "WorkAdventure PWA installieren",
        installing: "Wird installiert…",
        skip: "Im Browser fortfahren",
        continue: "Im Browser fortfahren",
    },
};

export default warning;
