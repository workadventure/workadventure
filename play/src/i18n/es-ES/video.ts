import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "¡Problema de conexión!",
    no_video_stream_received: "No se ha recibido ningún flujo de video.",
    user_is_muted: "{name} está silenciado.",
    reduce: "Reducir",
    connecting: "Conectando...",
    reconnecting: "Reconectando...",
    persistent_connection_issue: "Reconectando... Conexión inestable...",
    click_to_unblock: "Haz clic para desbloquear",
    click_and_drag_to_resize: "Haz clic y arrastra para cambiar el tamaño",
    away: {
        subtitle: "En pausa mientras estás ausente",
        cantSeeOrHear: "Nadie puede verte ni oírte",
        heardNotSeen: "Te pueden oír, pero no ver",
        cantSee: "Nadie puede verte",
        seenNotHeard: "Te pueden ver, pero no oír",
        cantHear: "Nadie puede oírte",
        turnOnBoth: "Activar cámara y micro",
        turnOnCamera: "Activar la cámara",
        turnOnMicrophone: "Activar el micro",
        turnOn: "Activar",
    },
    remoteAway: {
        inAnotherWindow: "{name} está en otra ventana o pestaña",
        cameraAndMicPaused: "Cámara y micro en pausa hasta que vuelva",
        cameraPaused: "Cámara en pausa hasta que vuelva",
        micPaused: "Micro en pausa hasta que vuelva",
    },
};

export default video;
