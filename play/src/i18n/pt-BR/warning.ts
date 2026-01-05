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
    browserNotSupported: {
        title: "😢 Navegador não suportado",
        message: "Seu navegador ({browserName}) não é mais suportado pelo WorkAdventure.",
        description:
            "Seu navegador está muito antigo para executar WorkAdventure. Por favor, atualize-o para a versão mais recente para continuar.",
        whatToDo: "O que você pode fazer?",
        option1: "Atualizar {browserName} para a versão mais recente",
        option2: "Sair do WorkAdventure e usar um navegador diferente",
        updateBrowser: "Atualizar navegador",
        leave: "Sair",
    },
};

export default warning;
