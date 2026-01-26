import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "Atualizar",
    title: "Sua lista de gravações",
    noRecordings: "Nenhuma gravação encontrada",
    errorFetchingRecordings: "Ocorreu um erro ao buscar as gravações",
    expireIn: "Expira em {days} dia{days}",
    download: "Baixar",
    close: "Fechar",
    ok: "Ok",
    recordingList: "Gravações",
    contextMenu: {
        openInNewTab: "Abrir em nova aba",
        delete: "Excluir",
    },
    notification: {
        deleteNotification: "Gravação excluída com sucesso",
        deleteFailedNotification: "Falha ao excluir gravação",
        recordingStarted: "Uma pessoa na discussão iniciou uma gravação.",
        downloadFailedNotification: "Falha ao baixar gravação",
    },
    actionbar: {
        title: {
            start: "Iniciar gravação",
            stop: "Parar gravação",
            inpProgress: "Uma gravação está em andamento",
        },
        desc: {
            needLogin: "Você precisa estar logado para gravar.",
            needPremium: "Você precisa ser premium para gravar.",
            advert: "Todos os participantes serão notificados de que você está iniciando uma gravação.",
            yourRecordInProgress: "Gravação em andamento, clique para parar.",
            inProgress: "Uma gravação está em andamento",
            notEnabled: "As gravações estão desabilitadas para este mundo.",
        },
    },
};

export default recording;
