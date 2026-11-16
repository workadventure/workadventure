import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Problème de connexion !",
    no_video_stream_received: "Absence de flux vidéo.",
    user_is_muted: "{name} est en sourdine.",
    reduce: "Réduire",
    connecting: "Connexion en cours...",
    reconnecting: "Reconnexion en cours...",
    persistent_connection_issue: "Reconnexion en cours... Connexion instable...",
    click_to_unblock: "Cliquez pour débloquer",
    click_and_drag_to_resize: "Cliquez et faites glisser pour redimensionner",
    away: {
        subtitle: "En pause pendant votre absence",
        cantSeeOrHear: "Personne ne peut vous voir ni vous entendre",
        heardNotSeen: "On vous entend, mais on ne vous voit pas",
        cantSee: "Personne ne peut vous voir",
        seenNotHeard: "On vous voit, mais on ne vous entend pas",
        cantHear: "Personne ne peut vous entendre",
        turnOnBoth: "Activer caméra et micro",
        turnOnCamera: "Activer la caméra",
        turnOnMicrophone: "Activer le micro",
        turnOn: "Activer",
    },
    remoteAway: {
        inAnotherWindow: "{name} est dans une autre fenêtre ou un autre onglet",
        cameraAndMicPaused: "Caméra et micro en pause jusqu'à son retour",
        cameraPaused: "Caméra en pause jusqu'à son retour",
    },
};

export default video;
