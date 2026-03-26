import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Problema de connexió!",
    no_video_stream_received: "No s'ha rebut cap flux de vídeo.",
    user_is_muted: "{name} està silenciat.",
    reduce: "Reduir",
    toggle_fullscreen: "Canviar a pantalla completa",
    exit_fullscreen: "Sortir de pantalla completa",
    connecting: "Connectant...",
    reconnecting: "Reconnectant...",
    persistent_connection_issue: "Reconnectant... Connexió inestable...",
    click_and_drag_to_resize: "Feu clic i arrossega per canviar la mida",
};

export default video;
