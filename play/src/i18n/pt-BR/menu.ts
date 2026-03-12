import type { BaseTranslation } from "../i18n-types.ts";

const menu: BaseTranslation = {
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
            mobile: "Abrir menu móvel",
            calendar: "Calendário",
            todoList: "Lista de tarefas",
        },
    },
    visitCard: {
        close: "Fechar",
        sendMessage: "Enviar mensagem",
    },
    profile: {
        login: "Entrar",
        logout: "Sair",
        helpAndTips: "Ajuda e dicas",
    },
    settings: {
        videoBandwidth: {
            title: "Qualidade de vídeo",
            low: "Baixa",
            recommended: "Recomendada",
            high: "High",
        },
        shareScreenBandwidth: {
            title: "Qualidade de compartilhamento de tela",
            low: "Baixa",
            recommended: "Recomendada",
            high: "High",
        },
        bandwidthConstrainedPreference: {
            title: "Se a largura de banda da rede estiver limitada",
            maintainFramerateTitle: "Manter animações suaves",
            maintainFramerateDescription:
                "Priorize a taxa de quadros em vez da resolução. Use quando animações suaves forem importantes, como ao transmitir jogos.",
            maintainResolutionTitle: "Manter o texto legível",
            maintainResolutionDescription:
                "Priorize a resolução em vez da taxa de quadros. Use quando a legibilidade do texto for importante, como em apresentações ou ao compartilhar código.",
            balancedTitle: "Equilibrar taxa de quadros e resolução",
            balancedDescription: "Tente manter um equilíbrio entre taxa de quadros e resolução.",
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
        otherSettings: "Todas as configurações",
        fullscreen: "Tela cheia",
        notifications: "Notificações",
        enablePictureInPicture: "Habilitar picture-in-picture",
        chatSounds: "Sons do chat",
        cowebsiteTrigger: "Sempre pergunte antes de abrir sites e salas do Jitsi Meet",
        ignoreFollowRequest: "Ignorar solicitações para seguir outros usuários",
        proximityDiscussionVolume: "Volume de discussão de proximidade",
        blockAudio: "Bloquear sons ambiente e música",
        disableAnimations: "Desabilitar animações do mapa",
        bubbleSound: "Som da bolha",
        bubbleSoundOptions: {
            ding: "Ding",
            wobble: "Wobble",
        },
        displayVideoQualityStats: "Exibir estatísticas de qualidade de vídeo",
    },
    invite: {
        description: "Compartilhe o link da sala!",
        copy: "Copiar",
        copied: "Copiado",
        share: "Compartilhar",
        walkAutomaticallyToPosition: "Caminhe automaticamente para a minha posição",
        selectEntryPoint: "Selecione um ponto de entrada",
        selectEntryPointSelect: "Selecione o ponto de entrada pelo qual os usuários chegarão",
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
        dragAndDrop: "Arraste e solte ou clique aqui para fazer upload do seu arquivo 🎧",
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
    chat: {
        matrixIDLabel: "Seu ID Matrix",
        settings: "Configurações",
        resetKeyStorageUpButtonLabel: "Redefinir seu armazenamento de chaves",
        resetKeyStorageConfirmationModal: {
            title: "Confirmação de redefinição do armazenamento de chaves",
            content: "Você está prestes a redefinir o armazenamento de chaves. Tem certeza?",
            warning:
                "Redefinir o armazenamento de chaves removerá sua sessão atual e todos os usuários confiáveis. Você pode perder o acesso a algumas mensagens anteriores e não será mais reconhecido como um usuário confiável. Certifique-se de entender completamente as consequências desta ação antes de prosseguir.",
            cancel: "Cancelar",
            continue: "Continuar",
        },
    },
    sub: {
        profile: "Perfil",
        settings: "Configurações",
        credit: "Crédito",
        globalMessages: "Mensagens globais",
        contact: "Contato",
        report: "Relatar problemas",
        chat: "Chat",
        help: "Ajuda e tutoriais",
        contextualActions: "Ações contextuais",
        shortcuts: "Atalhos",
    },
    shortcuts: {
        title: "Atalhos de Teclado",
        keys: "Atalho",
        actions: "Ação",
        moveUp: "Mover para Cima",
        moveDown: "Mover para Baixo",
        moveLeft: "Mover para Esquerda",
        moveRight: "Mover para Direita",
        speedUp: "Correr",
        interact: "Interagir",
        follow: "Seguir",
        openChat: "Abrir Chat",
        openUserList: "Abrir Lista de Usuários",
        toggleMapEditor: "Mostrar/Ocultar Editor de Mapas",
        rotatePlayer: "Girar Jogador",
        emote1: "Emote 1",
        emote2: "Emote 2",
        emote3: "Emote 3",
        emote4: "Emote 4",
        emote5: "Emote 5",
        emote6: "Emote 6",
        openSayPopup: "Abrir Popup de Fala",
        openThinkPopup: "Abrir Popup de Pensamento",
        walkMyDesk: "Ir para Minha Mesa",
    },
};

export default menu;
