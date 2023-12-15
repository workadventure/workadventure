import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    enable: {
        title: "Bitte schalte deine Kamera und dein Mikrofon ein.",
        start: "Los gehts!",
    },
    help: {
        title: "Zugriff auf Kamera / Mikrofon erforderlich",
        permissionDenied: "Zugriff verweigert",
        content: "Der Zugriff auf Kamera und Mikrofon muss im Browser freigegeben werden.",
        firefoxContent:
            'Bitte klicke auf "Diese Entscheidungen speichern" Schaltfläche um erneute Nachfragen nach der Freigabe in Firefox zu verhindern.',
        refresh: "Aktualisieren",
        continue: "Ohne Kamera fortfahren",
        screen: {
            firefox: "/resources/help-setting-camera-permission/de-DE-chrome.png",
            chrome: "/resources/help-setting-camera-permission/de-DE-chrome.png",
        },
    },
    webrtc: {
        title: "Der Video-Relay-Server antwortet nicht - Fehler",
        titlePending: "Verbinde mit dem Video-Relay-Server",
        error: '"TURN"-Server nicht erreichbar',
        content:
            "Eine Verbindung zum Video-Relay-Server konnte nicht hergetellt werden. Sie sind möglicherweise nicht in der Lage, mit anderen Benutzern zu kommunizieren.",
        solutionVpn:
            "Wenn Sie eine Verbindung über ein VPN herstellen, trennen Sie bitte die Verbindung zu Ihrem VPN und aktualisieren Sie die Webseite.",
        solutionHotspot:
            "Wenn Sie sich in einem eingeschränkten Netzwerk befinden (Firmennetzwerk...), versuchen Sie, das Netzwerk zu wechseln. Erstellen Sie zum Beispiel mit Ihrem Telefon einen WLAN-Hotspot und verbinden Sie sich über Ihr Telefon.",
        solutionNetworkAdmin: "Wenn Sie ein Netzwerkadministrator sind, überprüfen Sie die",
        preparingYouNetworkGuide: 'Anleitung "Preparing your network"',
        refresh: "Aktualisieren",
        continue: "Weiter",
    },
    my: {
        silentZone: "Stiller Bereich",
        nameTag: "Sie",
    },
    disable: "Kamera deaktivieren",
};

export default camera;
