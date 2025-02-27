import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Problema di connessione!",
    no_video_stream_received: "Nessun flusso video ricevuto.",
};

export default video;
