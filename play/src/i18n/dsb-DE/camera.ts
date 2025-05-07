import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    enable: {
        title: "Zašaltuj kameru a mikrofon.",
        start: "Start!",
    },
    help: {
        title: "Pśistup ku kamerje a mikrofonoju jo trjebny",
        permissionDenied: "Pśistup njejo zwólony",
        content: "Pśistup ku kamerje a mikrofonoju musy se zwóliś we browseru.",
        firefoxContent:
            'Klikni na bublin "Te nastajenja zachowaś", aby njemusali kuždy raz wótnowotki to zwólenje we Firefoxu aktiwěrowaś',
        continue: "Dalej mimo kamery",
        screen: {
            firefox: "/resources/help-setting-camera-permission/de-DE-chrome.png",
            chrome: "/resources/help-setting-camera-permission/de-DE-chrome.png",
        },
    },
    /*webrtc: {
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
    },*/
    my: {
        silentZone: "Śichy wobceŕk",
        nameTag: "Wy",
    },
    disable: "Kameru deaktiwěrowaś",
    menu: {
        moreAction: "Dalše akcije",
        closeMenu: "Meny zacyniś",
        senPrivateMessage: "Pśewatne powěsće posłaś (Pśichadźe)",
        kickoffUser: "Benutzer rauswerfen",
        muteAudioUser: "Audio stummschalten",
        muteAudioEveryBody: "Mute audio for everybody",
        muteVideoUser: "Video stummschalten",
        muteVideoEveryBody: "Video für alle stummschalten",
        pin: "Anheften",
        blockOrReportUser: "Benutzer blockieren oder melden",
    },
};

export default camera;
