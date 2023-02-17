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
    /*webrtc: {
        title: "TODO: Video relay server connection error",
        titlePending: "TODO: Video relay server connection pending",
        error: "TODO: TURN server isn't reachable",
        content: "TODO: The video relay server cannot be reached. You may be unable to communicate with other users.",
        solutionVpn: "TODO: If you are <strong>connecting via a VPN</strong>, please disconnect from you VPN and refresh the web page.",
        solutionHotspot: "TODO: If you are on a restricted network (company network...), try switching network. For instance, create a <strong>Wifi hotspot</strong> with your phone and connect via your phone.",
        solutionNetworkAdmin: "TODO: If you are a <strong>network administrator</strong>, review the ",
        preparingYouNetworkGuide: 'TODO: "Preparing your network" guide',
        refresh: "TODO: Refresh",
        continue: "TODO: Continue",
    },*/
    my: {
        silentZone: "Stiller Bereich",
        nameTag: "Sie",
    },
    disable: "Schalten Sie Ihre Kamera aus",
};

export default camera;
