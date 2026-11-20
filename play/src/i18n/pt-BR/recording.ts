import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "Atualizar",
    title: "Sua lista de gravações",
    noRecordings: "Nenhuma gravação encontrada",
    errorFetchingRecordings: "Ocorreu um erro ao buscar as gravações",
    expireIn: "Expira em {days} dia{s}",
    expiresOn: "Expira em {date}",
    download: "Baixar",
    close: "Fechar",
    recordingList: "Gravações",
    viewList: "Visualização em lista",
    viewCards: "Visualização em cartões",
    back: "Voltar",
    actions: "Ações",
    contextMenu: {
        openInNewTab: "Abrir em nova aba",
        delete: "Excluir",
    },
    notification: {
        deleteNotification: "Gravação excluída com sucesso",
        deleteFailedNotification: "Falha ao excluir gravação",
        startFailedNotification: "Falha ao iniciar gravação",
        stopFailedNotification: "Falha ao parar gravação",
        recordingStarted: "{name} iniciou uma gravação.",
        downloadFailedNotification: "Falha ao baixar gravação",
        recordingComplete: "Gravação concluída",
        recordingIsInProgress: "Gravação em andamento",
        unexpectedlyStoppedNotification: "A gravação foi interrompida inesperadamente",
        recordingSaved: "Sua gravação foi salva com sucesso.",
        howToAccess: "Para acessar suas gravações:",
        viewRecordings: "Ver gravações",
    },
    actionbar: {
        title: {
            start: "Iniciar gravação",
            stop: "Parar gravação",
            inProgress: "Uma gravação está em andamento",
        },
        desc: {
            needLogin: "Você precisa estar logado para gravar.",
            advert: "Todos os participantes serão notificados de que você está iniciando uma gravação.",
            yourRecordInProgress: "Gravação em andamento, clique para parar.",
            inProgress: "Uma gravação está em andamento",
        },
        spacePicker: {
            title: "Gravar",
            source: "O que gravar",
            savedHint: "Salva nas suas gravações quando você parar.",
            megaphone: "Gravar megafone",
            discussion: "Gravar discussão",
            withMap: "Layout do vídeo:",
            camerasOnly: "Somente câmeras",
            camerasOnlyHint:
                "Somente as câmeras, sem o mapa. Este vídeo não pode ser dirigido durante a gravação: sem painel de produção nem mudanças de layout ou zoom.",
            layout: {
                map: "Mapa primeiro",
                balanced: "Equilibrado",
                cameras: "Câmeras primeiro",
            },
        },
        producer: {
            preview: "No vídeo agora",
            layout: "Layout",
            zoom: "Zoom",
            zoomLevel: {
                tight: "Perto",
                wide: "Afastado",
                whole: "Mapa inteiro",
            },
            framing: "Enquadramento",
            follow: "Seguir a bolha",
            frameMyView: "Enquadrar o que vejo",
            cameras: "Câmeras",
            pin: "Fixar",
            unpin: "Desafixar",
            pinHint: "Uma pessoa fixada mantém seu bloco mesmo calada (até {max}).",
        },
    },
};

export default recording;
