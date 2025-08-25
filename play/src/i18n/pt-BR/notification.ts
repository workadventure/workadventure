import type { BaseTranslation } from "../i18n-types";

const notification: BaseTranslation = {
    discussion: "{name} quer discutir com você",
    message: "{name} envia uma mensagem",
    chatRoom: "na sala de chat",
    askToMuteMicrophone: "Posso silenciar seu microfone?",
    askToMuteCamera: "Posso silenciar sua câmera?",
    microphoneMuted: "Seu microfone foi silenciado por um moderador",
    cameraMuted: "Sua câmera foi silenciada por um moderador",
    announcement: "Anúncio",
    open: "Abrir",
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
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
    addNewTag: "adicionar uma nova tag: '{tag}'",
};

export default notification;
