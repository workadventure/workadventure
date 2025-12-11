import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Problema di connessione!",
    no_video_stream_received: "Nessun flusso video ricevuto.",
    click_and_drag_to_resize: "Clicca e trascina per ridimensionare",
};

export default video;
