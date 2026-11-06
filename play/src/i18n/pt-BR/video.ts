import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Problema de conectividade de rede",
    no_video_stream_received: "Nenhum stream de vídeo recebido.",
    user_is_muted: "{name} está silenciado.",
    reduce: "Reduzir",
    connecting: "Conectando...",
    reconnecting: "Reconectando...",
    persistent_connection_issue: "Reconectando... Conexão instável...",
    click_to_unblock: "Clique para desbloquear",
    click_and_drag_to_resize: "Clique e arraste para redimensionar",
    away: {
        subtitle: "Pausado enquanto você está ausente",
        cantSeeOrHear: "Ninguém pode ver nem ouvir você",
        heardNotSeen: "Podem ouvir você, mas não ver",
        cantSee: "Ninguém pode ver você",
        seenNotHeard: "Podem ver você, mas não ouvir",
        cantHear: "Ninguém pode ouvir você",
        turnOnBoth: "Ativar câmera e microfone",
        turnOnCamera: "Ativar câmera",
        turnOnMicrophone: "Ativar microfone",
        turnOn: "Ativar",
    },
};

export default video;
