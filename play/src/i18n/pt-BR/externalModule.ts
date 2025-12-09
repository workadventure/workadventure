import type { BaseTranslation } from "../i18n-types";

const externalModule: BaseTranslation = {
    status: {
        onLine: "Status ok ✅",
        offLine: "Status offline ❌",
        warning: "Status de aviso ⚠️",
        sync: "Status sincronizando 🔄",
    },
    teams: {
        openingMeeting: "Abrindo Reunião do Teams...",
        unableJoinMeeting: "Não foi possível entrar na Reunião do Teams!",
        userNotConnected: "Você não está sincronizado com sua conta Outlook ou Google!",
        connectToYourTeams: "Conecte-se à sua conta Outlook ou Google 🙏",
        temasAppInfo:
            "Teams é um aplicativo Microsoft 365 que ajuda sua equipe a se manter conectada e organizada. Você pode conversar, reunir-se, ligar e colaborar tudo em um só lugar 😍",
        buttonSync: "Sincronizar meu Teams 🚀",
        buttonConnect: "Conectar meu teams 🚀",
    },
    discord: {
        integration: "INTEGRAÇÃO",
        explainText:
            "Ao conectar sua conta do discord aqui, você poderá receber suas mensagens diretamente no chat do workadventure. Após sincronizar um servidor, criaremos as salas que ele contém, você só terá que se juntar a elas no chat do Workadventure.",
        login: "Conectar ao Discord",
        fetchingServer: "Buscando seus servidores Discord... 👀",
        qrCodeTitle: "Escaneie o código QR com seu aplicativo Discord para fazer login.",
        qrCodeExplainText:
            "Escaneie o código QR com seu aplicativo Discord para fazer login. Os códigos QR têm tempo limitado, às vezes você precisa gerar um novo",
        qrCodeRegenerate: "Obter um novo código QR",
        tokenInputLabel: "Token do Discord",
        loginToken: "Fazer login com token",
        loginTokenExplainText: "Você precisa inserir seu token do Discord. Para realizar a integração do Discord veja",
        sendDiscordToken: "enviar",
        tokenNeeded: "Você precisa inserir seu token do Discord. Para realizar a integração do Discord veja",
        howToGetTokenButton: "Como obter meu token de login do discord",
        loggedIn: "Conectado com:",
        saveSync: "Salvar e sincronizar",
        logout: "Sair",
        guilds: "Servidores Discord",
        guildExplain: "Selecione os canais que você deseja adicionar à interface de chat do Workadventure.\n",
    },
    outlook: {
        signIn: "Entrar com Outlook",
        popupScopeToSync: "Conectar minha Conta Outlook",
        popupScopeToSyncExplainText:
            "Precisamos conectar sua conta Outlook para sincronizar seu calendário e/ou tarefas. Isso permitirá que você veja suas reuniões e tarefas no WorkAdventure e participe delas diretamente do mapa.",
        popupScopeToSyncCalendar: "Sincronizar meu calendário",
        popupScopeToSyncTask: "Sincronizar minhas tarefas",
        popupCancel: "Cancelar",
        isSyncronized: "Sincronizado com Outlook",
        popupScopeIsConnectedExplainText: "Você já está conectado, clique no botão para fazer logout e reconectar.",
        popupScopeIsConnectedButton: "Logout",
        popupErrorTitle: "⚠️ A sincronização do módulo Outlook ou Teams falhou",
        popupErrorDescription:
            "A sincronização de inicialização do módulo Outlook ou Teams falhou. Para estar conectado, tente reconectar.",
        popupErrorContactAdmin: "Se o problema persistir, entre em contato com seu administrador.",
        popupErrorShowMore: "Mostrar mais informações",
        popupErrorMoreInfo1:
            "Pode haver um problema com o processo de entrada. Verifique se o provedor SSO Azure está configurado corretamente.",
        popupErrorMoreInfo2:
            'Verifique se o escopo "offline_access" está habilitado para o provedor SSO Azure. Este escopo é necessário para obter o token de atualização e manter o módulo Teams ou Outlook conectado.',
    },
    google: {
        signIn: "Entrar com Google",
        popupScopeToSync: "Conectar minha Conta Google",
        popupScopeToSyncExplainText:
            "Precisamos conectar sua conta Google para sincronizar seu calendário e/ou tarefas. Isso permitirá que você veja suas reuniões e tarefas no WorkAdventure e participe delas diretamente do mapa.",
        popupScopeToSyncCalendar: "Sincronizar meu calendário",
        popupScopeToSyncTask: "Sincronizar minhas tarefas",
        popupCancel: "Cancelar",
        isSyncronized: "Sincronizado com Google",
        popupScopeToSyncMeet: "Criar reuniões online",
        openingMeet: "Abrindo Google Meet... 🙏",
        unableJoinMeet: "Não foi possível entrar no Google Meet 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "Criando seu Espaço Google… isso levará apenas alguns segundos 💪",
            guestError: "Você não está conectado, então não pode criar um Google Meet 😭",
            guestExplain:
                "Por favor, faça login na plataforma para criar um Google Meet, ou peça ao proprietário para criar um para você 🚀",
            error: "As configurações do seu Google Workspace não permitem criar um Meet.",
            errorExplain:
                "Não se preocupe, você ainda pode participar de reuniões quando alguém compartilhar um link 🙏",
        },
        popupScopeIsConnectedButton: "Logout",
        popupScopeIsConnectedExplainText: "Você já está conectado, clique no botão para fazer logout e reconectar.",
    },
    calendar: {
        title: "Suas reuniões hoje",
        joinMeeting: "Clique aqui para participar da reunião",
    },
    todoList: {
        title: "To Do",
        sentence: "Faça uma pausa 🙏 talvez um café ou chá? ☕",
    },
};

export default externalModule;
