import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Problema di connessione!",
    no_video_stream_received: "Nessun flusso video ricevuto.",
    user_is_muted: "{name} è disattivato.",
    reduce: "Riduci",
    toggle_fullscreen: "Attiva/disattiva schermo intero",
    exit_fullscreen: "Esci da schermo intero",
    click_to_unmute: "Clicca per attivare l'audio",
    connecting: "Connessione in corso...",
    reconnecting: "Riconnessione in corso...",
    persistent_connection_issue: "Riconnessione in corso... Connessione instabile...",
    click_and_drag_to_resize: "Clicca e trascina per ridimensionare",
};

export default video;
