import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "¡Problema de conexión!",
    no_video_stream_received: "No se ha recibido ningún flujo de video.",
    user_is_muted: "{name} está silenciado.",
    reduce: "Reducir",
    toggle_fullscreen: "Cambiar a pantalla completa",
    exit_fullscreen: "Salir de pantalla completa",
    click_to_unmute: "Haz clic para activar el sonido",
    connecting: "Conectando...",
    reconnecting: "Reconectando...",
    persistent_connection_issue: "Reconectando... Conexión inestable...",
    click_and_drag_to_resize: "Haz clic y arrastra para cambiar el tamaño",
};

export default video;
