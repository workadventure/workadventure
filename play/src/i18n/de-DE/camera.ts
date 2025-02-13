import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    enable: {
        title: "Bitte schalte deine Kamera und dein Mikrofon ein.",
        start: "Willkommen auf unserer Seite zur Konfiguration von Audio- und Videogeräten! Finden Sie hier die Werkzeuge, um Ihr Online-Erlebnis zu verbessern. Passen Sie die Einstellungen nach Ihren Vorlieben an, um mögliche Probleme zu lösen. Stellen Sie sicher, dass Ihre Hardware ordnungsgemäß angeschlossen und auf dem neuesten Stand ist. Erkunden und testen Sie verschiedene Konfigurationen, um herauszufinden, was am besten für Sie funktioniert.",
    },
    help: {
        title: "Zugriff auf Kamera / Mikrofon erforderlich",
        permissionDenied: "Zugriff verweigert",
        content: "Der Zugriff auf Kamera und Mikrofon muss im Browser freigegeben werden.",
        firefoxContent:
            'Bitte klicke auf die Schaltfläche "Diese Entscheidung speichern", um erneute Nachfragen nach der Freigabe in Firefox zu verhindern.',
        continue: "Ohne Kamera fortfahren",
        screen: {
            firefox: "/resources/help-setting-camera-permission/de-DE-firefox.png",
            chrome: "/resources/help-setting-camera-permission/de-DE-chrome.png",
        },
    },
    webrtc: {
        title: "Der Video-Relay-Server antwortet nicht - Fehler",
        titlePending: "Verbinde mit dem Video-Relay-Server",
        error: '"TURN"-Server nicht erreichbar',
        content:
            "Eine Verbindung zum Video-Relay-Server konnte nicht hergestellt werden. Sie sind möglicherweise nicht in der Lage, mit anderen Benutzern zu kommunizieren.",
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
    menu: {
        moreAction: "Mehr Aktionen",
        closeMenu: "Menü schließen",
        senPrivateMessage: "Private Nachricht senden (kommt bald)",
        kickoffUser: "Benutzer rauswerfen",
        muteAudioUser: "Audio stummschalten",
        muteAudioEveryBody: "Audio für alle stummschalten",
        muteVideoUser: "Video stummschalten",
        muteVideoEveryBody: "Video für alle stummschalten",
        pin: "Anheften",
        blockOrReportUser: "Benutzer blockieren oder melden",
    },
};

export default camera;
