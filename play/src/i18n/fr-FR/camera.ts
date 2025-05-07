import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    editCam: "Modifier la caméra",
    editMic: "Modifier le micro",
    editSpeaker: "Modifier la sortie audio",
    active: "Actif",
    disabled: "Desactivé",
    notRecommended: "Non recommandé",
    enable: {
        title: "Allumez votre caméra et votre microphone",
        start: "Bienvenue sur notre page de configuration des périphériques audio et vidéo ! Trouvez ici les outils pour optimiser votre expérience en ligne. Ajustez les paramètres selon vos préférences pour résoudre les problèmes éventuels. Assurez-vous que votre matériel est bien connecté et à jour. Explorez et testez différentes configurations pour trouver celle qui convient le mieux.",
    },
    help: {
        title: "Accès à la caméra / au microphone nécessaire",
        permissionDenied: "Permission refusée",
        content: "Vous devez autoriser l'accès à la caméra et au microphone dans votre navigateur.",
        firefoxContent:
            'Veuillez cocher la case "Se souvenir de cette décision" si vous ne voulez pas que Firefox vous demande sans cesse l\'autorisation.',
        allow: "Autoriser la webcam",
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
        newDeviceDetected: "Nouveau périphérique détecté {device} 🎉 Changer ? [ESPACE]",
    },
    my: {
        silentZone: "Zone silencieuse",
        silentZoneDesc:
            "Vous êtes dans une zone silencieuse, les autres utilisateurs ne peuvent pas vous parler, votre micro et caméra est désactivé. Bonne pause !",
        nameTag: "Vous",
        loading: "Chargement de votre webcam...",
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
        blockOrReportUser: "Modération",
    },
};

export default camera;
