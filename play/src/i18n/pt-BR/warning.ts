import type { BaseTranslation } from "../i18n-types";

const warning: BaseTranslation = {
    title: "Aviso!",
    content: `Este mundo está perto do seu limite!. Você pode atualizar sua capacidade <a href="{upgradeLink}" target="_blank">aqui</a>`,
    limit: "Este mundo está perto do seu limite!",
    accessDenied: {
        camera: "Acesso à câmera negado. Clique aqui e verifique as permissões do seu navegador.",
        screenSharing: "Compartilhamento de tela negado. Clique aqui e verifique as permissões do seu navegador.",
        teleport: "Você não tem direito de teleportar este usuário.",
        room: "Acesso a sala negado. Você não tem permissão para entrar nesta sala.",
    },
    importantMessage: "Mensagem importante",
    connectionLost: "Conexão perdida. Reconectando...",
    connectionLostTitle: "Conexão perdida",
    connectionLostSubtitle: "Reconectando",
    waitingConnectionTitle: "Aguardando a conexão",
    waitingConnectionSubtitle: "Conectando",
    megaphoneNeeds: "Para usar o megafone, você deve ativar sua câmera ou seu microfone ou compartilhar sua tela.",
    mapEditorShortCut: "Houve um erro ao tentar abrir o editor de mapas.",
    mapEditorNotEnabled: "O editor de mapas não está habilitado neste mundo.",
    popupBlocked: {
        title: "Bloqueador de pop-up",
        content: "Por favor, permita pop-ups para este site nas configurações do seu navegador.",
        done: "Ok",
    },
};

export default warning;
