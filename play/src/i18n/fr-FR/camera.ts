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
        title: "Erreur de connexion avec le serveur vidéo relai",
        titlePending: "En attente de connexion avec le serveur vidéo relai",
        error: "Impossible d'accéder au serveur TURN",
        content:
            "Impossible de se connecter au serveur vidéo relais. La connexion audio/vidéo avec d'autres utilisateurs pourrait ne pas fonctionner.",
        solutionVpn:
            "Si vous êtes connectés avec <strong>un VPN</strong>, vous devez vous déconnecter du VPN et rafraîchir votre page pour profiter de la meilleure expérience possible.",
        solutionVpnNotAskAgain: "Compris, ne plus afficher cette page 🫡",
        solutionHotspot:
            "Si vous êtes sur un réseau sécurisé (réseau d'entreprise...), essayez de changer de réseau. Par exemple, en créant un <strong>hotspot Wifi</strong> avec votre smartphone.",
        solutionNetworkAdmin: "Si vous êtes <strong>administrateur réseay</strong>, consultez le ",
        preparingYouNetworkGuide: '"guide de préparation du réseau"',
        refresh: "Rafraîchir",
        continue: "Continuer",
    },
    my: {
        silentZone: "Zone silencieuse",
        nameTag: "Vous",
    },
    disable: "Couper la caméra",
    menu: {
        moreAction: "Plus d'actions",
        closeMenu: "Fermer le menu",
        senPrivateMessage: "Envoyer un message privé (bientôt disponible)",
        kickoffUser: "Exclure l'utilisateur",
        muteAudioUser: "Couper le son",
        muteAudioEveryBody: "Couper le son pour tout le monde",
        muteVideoUser: "Couper la vidéo",
        muteVideoEveryBody: "Couper la vidéo pour tout le monde",
        pin: "Épingler",
        blockOrReportUser: "Bloquer ou signaler l'utilisateur",
    },
};

export default camera;
