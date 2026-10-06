import type { BaseTranslation } from "../i18n-types";

const notification: BaseTranslation = {
    discussion: "{name} quer discutir com você",
    message: "{name} envia uma mensagem",
    askToMuteMicrophone: "Posso silenciar seu microfone?",
    askToMuteCamera: "Posso silenciar sua câmera?",
    microphoneMuted: "Seu microfone foi silenciado por um moderador",
    cameraMuted: "Sua câmera foi silenciada por um moderador",
    givenTheFloor: "É a sua vez de falar",
    givenTheFloorEnableMicrophone: "É a sua vez de falar — ative o microfone",
    floorRevoked: "Você não tem mais a palavra",
    announcement: "Anúncio",
    help: {
        title: "Acesso às notificações negado",
        permissionDenied: "Permissão negada",
        content:
            "Não perca nenhuma discussão. Habilite as notificações para ser notificado quando alguém quiser falar com você, mesmo quando você não estiver na aba do WorkAdventure.",
        firefoxContent:
            'Por favor, clique na caixa de seleção "Lembrar desta decisão", se você não quiser que o Firefox continue pedindo a autorização.',
        refresh: "Atualizar",
        continue: "Continuar sem notificação",
        screen: {
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
        screenAlt: "Permitir notificações na barra de endereços do Chrome",
    },
    addNewTag: "adicionar uma nova tag: '{tag}'",
    floorGivenBack: "Você devolveu a palavra",
    handLowered: "Um moderador baixou sua mão",
    removedFromConversation: "Um moderador tirou você da conversa.",
    actionFailed: "Não foi possível concluir esta ação",
    screenSharingError: "Não é possível iniciar o compartilhamento de tela",
    recordingStarted: "Uma pessoa na discussão iniciou uma gravação.",
    urlCopiedToClipboard: "URL copiada para a área de transferência",
};

export default notification;
