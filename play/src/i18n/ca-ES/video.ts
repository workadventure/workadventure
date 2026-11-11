import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Problema de connexió!",
    no_video_stream_received: "No s'ha rebut cap flux de vídeo.",
    user_is_muted: "{name} està silenciat.",
    reduce: "Reduir",
    connecting: "Connectant...",
    reconnecting: "Reconnectant...",
    persistent_connection_issue: "Reconnectant... Connexió inestable...",
    click_to_unblock: "Feu clic per desbloquejar",
    click_and_drag_to_resize: "Feu clic i arrossega per canviar la mida",
    away: {
        subtitle: "En pausa mentre estàs absent",
        cantSeeOrHear: "Ningú no et pot veure ni sentir",
        heardNotSeen: "Et poden sentir, però no veure",
        cantSee: "Ningú no et pot veure",
        seenNotHeard: "Et poden veure, però no sentir",
        cantHear: "Ningú no et pot sentir",
        turnOnBoth: "Activa càmera i micro",
        turnOnCamera: "Activa la càmera",
        turnOnMicrophone: "Activa el micro",
        turnOn: "Activa",
    },
    remoteAway: {
        inAnotherWindow: "{name} és en una altra finestra o pestanya",
        cameraAndMicPaused: "Càmera i micro en pausa fins que torni",
        cameraPaused: "Càmera en pausa fins que torni",
    },
};

export default video;
