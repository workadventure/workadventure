import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Problema de conectividade de rede",
    no_video_stream_received: "Nenhum stream de vídeo recebido.",
    user_is_muted: "{name} está silenciado.",
    reduce: "Reduzir",
    toggle_fullscreen: "Alternar tela cheia",
    exit_fullscreen: "Sair da tela cheia",
    click_to_unmute: "Clique para reativar som",
    connecting: "Conectando...",
    reconnecting: "Reconectando...",
    persistent_connection_issue: "Reconectando... Conexão instável...",
    click_and_drag_to_resize: "Clique e arraste para redimensionar",
};

export default video;
