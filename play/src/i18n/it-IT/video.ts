import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Problema di connessione!",
    no_video_stream_received: "Nessun flusso video ricevuto.",
    user_is_muted: "{name} è disattivato.",
    reduce: "Riduci",
    connecting: "Connessione in corso...",
    reconnecting: "Riconnessione in corso...",
    persistent_connection_issue: "Riconnessione in corso... Connessione instabile...",
    click_to_unblock: "Clicca per sbloccare",
    click_and_drag_to_resize: "Clicca e trascina per ridimensionare",
    away: {
        subtitle: "In pausa mentre sei assente",
        cantSeeOrHear: "Nessuno può vederti né sentirti",
        heardNotSeen: "Ti sentono, ma non ti vedono",
        cantSee: "Nessuno può vederti",
        seenNotHeard: "Ti vedono, ma non ti sentono",
        cantHear: "Nessuno può sentirti",
        turnOnBoth: "Attiva fotocamera e microfono",
        turnOnCamera: "Attiva la fotocamera",
        turnOnMicrophone: "Attiva il microfono",
        turnOn: "Attiva",
    },
    remoteAway: {
        inAnotherWindow: "{name} è in un'altra finestra o scheda",
        cameraAndMicPaused: "Fotocamera e microfono in pausa fino al suo ritorno",
        cameraPaused: "Fotocamera in pausa fino al suo ritorno",
    },
};

export default video;
