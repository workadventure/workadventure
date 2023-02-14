import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    enable: {
        title: "Allumez votre caméra et votre microphone",
        start: "C'est parti!",
    },
    help: {
        title: "Accès à la caméra / au microphone nécessaire",
        permissionDenied: "Permission refusée",
        content: "Vous devez autoriser l'accès à la caméra et au microphone dans votre navigateur.",
        firefoxContent:
            'Veuillez cocher la case "Se souvenir de cette décision" si vous ne voulez pas que Firefox vous demande sans cesse l\'autorisation.',
        refresh: "Rafraîchir",
        continue: "Continuer sans webcam",
        screen: {
            firefox: "/resources/help-setting-camera-permission/fr-FR-chrome.png",
            chrome: "/resources/help-setting-camera-permission/fr-FR-chrome.png",
        },
    },
    webrtc: {
        title: "Erreur de connexion WebRtc",
        error: "STUN / TURN serveur ne sont pas accessibles",
        content:
            "Impossible de se connecter au serveur vidéo relais. La connexion audio/vidéo avec d'autres utilisateurs pourrait ne pas fonctionner. Si vous êtes connectés avec un VPN, vous devez vous déconnecter pour profiter de la meilleure expérience possible. Rendez-vous sur le lien ci-dessous pour tester votre connexion.",
        testUrl: "Test ma connexion WebRtc",
        refresh: "Rafraîchir",
        continue: "Continuer",
    },
    my: {
        silentZone: "Zone silencieuse",
        nameTag: "Vous",
    },
    disable: "Couper la caméra",
};

export default camera;
