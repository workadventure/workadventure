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
        userNotConnected: "Você não está conectado ao Teams!",
        connectToYourTeams: "Conecte-se à sua conta do Teams 🙏",
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
};

export default externalModule;
