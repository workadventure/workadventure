import type { BaseTranslation } from "../i18n-types";

const actionbar: BaseTranslation = {
    understand: "Entendi!",
    edit: "Editar",
    cancel: "Cancelar",
    close: "Fechar",
    login: "Entrar",
    map: "Mapa",
    profil: "Editar seu nome",
    startScreenSharing: "Iniciar compartilhamento de tela",
    stopScreenSharing: "Parar compartilhamento de tela",
    screenSharingMode: "Modo de compartilhamento de tela",
    focusMode: "Modo foco",
    rightMode: "Modo direito",
    hideMode: "Modo oculto",
    lightMode: "Modo claro",
    calendar: "Calendário",
    todoList: "Lista de tarefas",
    woka: "Personalizar seu avatar",
    companion: "Adicionar companheiro",
    //megaphone: "Usar megafone",
    test: "Testar minhas configurações",
    editCamMic: "Editar câmera / microfone",
    allSettings: "Todas as configurações",
    globalMessage: "Enviar mensagem global",
    mapEditor: "Editor de mapa",
    mapEditorMobileLocked: "Editor de mapa está bloqueado no modo móvel",
    mapEditorLocked: "Editor de mapa está bloqueado 🔐",
    app: "Aplicações de terceiros",
    camera: {
        disabled: "Sua câmera está desabilitada",
        activate: "Ativar sua câmera",
        noDevices: "Nenhum dispositivo de câmera encontrado",
    },
    microphone: {
        disabled: "Seu microfone está desabilitado",
        activate: "Ativar seu microfone",
        noDevices: "Nenhum dispositivo de microfone encontrado",
    },
    speaker: {
        disabled: "Seu alto-falante está desabilitado",
        activate: "Ativar seu alto-falante",
        noDevices: "Nenhum dispositivo de alto-falante encontrado",
    },
    status: {
        ONLINE: "Online",
        AWAY: "Ausente",
        BACK_IN_A_MOMENT: "Volto em instantes",
        DO_NOT_DISTURB: "Não perturbe",
        BUSY: "Ocupado",
        OFFLINE: "Offline",
        SILENT: "Silencioso",
        JITSI: "Em uma reunião",
        BBB: "Em uma reunião",
        DENY_PROXIMITY_MEETING: "Não disponível",
        SPEAKER: "Em uma reunião",
    },
    subtitle: {
        camera: "Câmera",
        microphone: "Microfone",
        speaker: "Saída de áudio",
    },
    help: {
        chat: {
            title: "Enviar mensagem de texto",
            desc: "Compartilhe suas ideias ou inicie uma discussão, diretamente por escrito. Simples, claro, eficaz.",
        },
        users: {
            title: "Exibir lista de usuários",
            desc: "Veja quem está lá, acesse seus cartões de visita, envie uma mensagem ou caminhe até eles com um clique!",
        },
        emoji: {
            title: "Exibir um emoji",
            desc: "Expresse como você se sente com apenas um clique usando reações emoji. Apenas toque e vá!",
        },
        audioManager: {
            title: "Volume dos sons ambiente",
            desc: "Controle o volume dos sons ambiente para uma experiência personalizada e confortável.",
            pause: "Clique aqui para pausar o áudio",
            play: "Clique aqui para reproduzir o áudio",
            stop: "Clique aqui para parar o áudio",
        },
        audioManagerNotAllowed: {
            title: "Sons ambiente bloqueados",
            desc: "Seu navegador impediu a reprodução de sons ambiente. Clique no ícone para começar a reproduzir sons.",
        },
        follow: {
            title: "Pedir para seguir",
            desc: "Você pode pedir a um usuário para segui-lo, e se esta solicitação for aceita, seu Woka automaticamente o seguirá, estabelecendo assim uma conexão perfeita.",
        },
        unfollow: {
            title: "Parar de seguir",
            desc: "Você pode escolher parar de seguir um usuário a qualquer momento. Seu Woka então parará de segui-lo, devolvendo sua liberdade de movimento.",
        },
        lock: {
            title: "Bloquear conversa",
            desc: "Ao habilitar este recurso, você garante que ninguém possa se juntar à discussão. Você é o mestre do seu espaço, e apenas aqueles já presentes podem interagir.",
        },
        mic: {
            title: "Habilitar/desabilitar seu microfone",
            desc: "Controle seu microfone para participar ou se silenciar nas conversas conforme necessário.",
        },
        micDisabledByStatus: {
            title: "Microfone desabilitado",
            desc: 'Seu microfone está desabilitado porque você está no status "{status}".',
        },
        cam: {
            title: "Habilitar/desabilitar sua câmera",
            desc: "Controle sua câmera para participar visualmente ou manter privacidade conforme necessário.",
        },
        camDisabledByStatus: {
            title: "Câmera desabilitada",
            desc: 'Sua câmera está desabilitada porque você está no status "{status}".',
        },
        share: {
            title: "Compartilhar sua tela",
            desc: "Quer compartilhar sua tela com outros usuários? Você pode! Você pode mostrar sua tela para todos no chat, e pode escolher compartilhar sua tela inteira ou apenas uma janela específica.",
        },
        apps: {
            title: "Aplicações de terceiros",
            desc: "Você tem a liberdade de navegar em aplicações externas enquanto permanece em nossa aplicação, para uma experiência fluida e enriquecida.",
        },
        roomList: {
            title: "Lista de salas",
            desc: "Explore e navegue entre diferentes salas disponíveis para encontrar o espaço perfeito para suas atividades.",
        },
        calendar: {
            title: "Calendário",
            desc: "Gerencie seus eventos e compromissos diretamente integrados à sua experiência no workspace.",
        },
        todolist: {
            title: "Lista de tarefas",
            desc: "Organize e acompanhe suas tarefas e projetos de forma eficiente dentro do ambiente virtual.",
        },
        pictureInPicture: {
            title: "Picture in picture",
            descDisabled:
                "Infelizmente, este recurso não está disponível no seu dispositivo ❌. Tente usar outro dispositivo ou navegador, como Chrome ou Edge, para acessar este recurso.",
            desc: "Você pode usar o recurso picture in picture para assistir a um vídeo ou uma apresentação enquanto está em uma conversa. Basta clicar no ícone picture in picture e aproveitar seu conteúdo.",
        },
    },
    listStatusTitle: {
        enable: "Alterar seu status",
    },
    externalModule: {
        status: {
            onLine: "Status ok ✅",
            offLine: "Status offline ❌",
            warning: "Status de aviso ⚠️",
            sync: "Status sincronizando 🔄",
        },
    },
    featureNotAvailable: "Recurso não disponível para sua sala 😭",
    issueReport: {
        menuAction: "Reportar um problema",
        formTitle: "Reportar um problema",
        emailLabel: "Email (não requerida)",
        nameLabel: "Nome (não requerido)",
        descriptionLabel: "Descrição* (requerida)",
        descriptionPlaceholder: "Qual é o problema? O que você esperava?",
        submitButtonLabel: "Reportar um problema",
        cancelButtonLabel: "Cancelar",
        confirmButtonLabel: "Confirmar",
        addScreenshotButtonLabel: "Adicionar uma captura de tela",
        removeScreenshotButtonLabel: "Remover a captura de tela",
        successMessageText: "Obrigado por seu relatório! Nós o revisaremos o mais rápido possível.",
        highlightToolText: "Destacar",
        hideToolText: "Ocultar",
        removeHighlightText: "Remover",
    },
    personalDesk: {
        label: "Ir para minha mesa",
        unclaim: "Liberar minha mesa",
        errorNoUser: "Não foi possível encontrar suas informações de usuário",
        errorNotFound: "Você ainda não tem uma mesa pessoal",
        errorMoving: "Não foi possível chegar à sua mesa pessoal",
        errorUnclaiming: "Não foi possível liberar sua mesa pessoal",
    },
};

export default actionbar;
