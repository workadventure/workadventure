import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    title: "Menu",
    icon: {
        open: {
            menu: "Abrir menu",
            invite: "Mostrar convite",
            register: "Registro",
            chat: "Abrir bate-papo",
            userlist: "Lista de usuários",
            openEmoji: "Abrir pop-up de emoji selecionado",
            closeEmoji: "Fechar menu de emojis",
        },
    },
    visitCard: {
        close: "Fechar",
    },
    profile: {
        edit: {
            name: "Edite seu nome",
            woka: "Edite seu personagem",
            companion: "Edite seu companheiro",
            camera: "Edite sua câmera",
        },
        login: "Entrar",
        logout: "Sair",
    },
    settings: {
        videoBandwidth: {
            title: "Qualidade de vídeo",
            low: "Baixa",
            recommended: "Recomendada",
            unlimited: "Ilimitada",
        },
        shareScreenBandwidth: {
            title: "Qualidade de compartilhamento de tela",
            low: "Baixa",
            recommended: "Recomendada",
            unlimited: "Ilimitada",
        },
        language: {
            title: "Linguagem",
        },
        privacySettings: {
            title: "Modo ausente",
            explanation:
                'Enquanto a guia WorkAdventure em seu navegador não estiver visível. WorkAdventure muda para "modo ausente"',
            cameraToggle: 'Mantenha a câmera ativa no "modo ausente"',
            microphoneToggle: 'Mantenha o microfone ativo no "modo ausente"',
        },
        save: "Salvar",
        fullscreen: "Tela cheia",
        notifications: "Notificações",
        cowebsiteTrigger: "Sempre pergunte antes de abrir sites e salas do Jitsi Meet",
        ignoreFollowRequest: "Ignorar solicitações para seguir outros usuários",
    },
    invite: {
        description: "Compartilhe o link da sala!",
        copy: "Copiar",
        share: "Compartilhar",
        walkAutomaticallyToPosition: "Caminhe automaticamente para a minha posição",
        selectEntryPoint: "Selecione um ponto de entrada",
    },
    globalMessage: {
        text: "Texto",
        audio: "Áudio",
        warning: "Transmissão para todas as salas do mundo",
        enter: "Digite sua mensagem aqui...",
        send: "Enviar",
    },
    globalAudio: {
        uploadInfo: "Enviar um arquivo",
        error: "Nenhum arquivo selecionado. Você precisa fazer o upload de um arquivo antes de enviá-lo.",
        errorUpload:
            "Erro no upload do arquivo. Verifique seu arquivo e tente novamente. Se o problema persistir, entre em contato com o administrador.",
    },
    contact: {
        gettingStarted: {
            title: "Começando",
            description:
                "WorkAdventure permite que você crie um espaço online para se comunicar espontaneamente com outras pessoas. E tudo começa com a criação do seu próprio espaço. Escolha entre uma grande seleção de mapas pré-fabricados por nossa equipe.",
        },
        createMap: {
            title: "Crie seu mapa",
            description: "Você também pode criar seu próprio mapa personalizado seguindo a etapa da documentação.",
        },
    },
    about: {
        mapInfo: "Informações no mapa",
        mapLink: "link para este mapa",
        copyrights: {
            map: {
                title: "Direitos autorais do mapa",
                empty: "O criador do mapa não declarou direitos autorais para o mapa.",
            },
            tileset: {
                title: "Direitos autorais dos tilesets",
                empty: "O criador do mapa não declarou direitos autorais para os tilesets. Isso não significa que esses tilesets não tenham licença.",
            },
            audio: {
                title: "Direitos autorais de arquivos de áudio",
                empty: "O criador do mapa não declarou direitos autorais para arquivos de áudio. Isso não significa que esses arquivos de áudio não tenham licença.",
            },
        },
    },
    sub: {
        profile: "Perfil",
        settings: "Configurações",
        invite: "Convidar",
        credit: "Crédito",
        globalMessages: "Mensagens globais",
        contact: "Contato",
        report: "Report Issues",
    },
};

export default menu;
