import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "Module ok ✅",
        offLine: "Module off ❌",
        warning: "Module error ⚠️",
        sync: "Module en cours de synchro 🔄",
    },
    teams: {
        openingMeeting: "Ouverture de la réunion Teams...",
        unableJoinMeeting: "Impossible de rejoindre la réunion Teams !",
        userNotConnected: "Vous n'êtes pas connecté à Teams !",
        connectToYourTeams: "Connectez-vous à votre compte Teams 🙏",
        temasAppInfo:
            "Teams est une application Microsoft 365 qui aide votre équipe à rester connectée et organisée. Vous pouvez discuter, rencontrer, appeler et collaborer au même endroit 😍",
        buttonSync: "Synchroniser Teams 🚀",
        buttonConnect: "Ouvrir Teams 🚀",
    },
    discord: {
        integration: "INTÉGRATION",
        explainText:
            "En connectant votre compte discord ici, vous pourrez recevoir vos messages directement dans le chat workadventure. Après avoir synchronisé un serveur, nous créerons les salles qu'il contient, vous n'aurez plus qu'à les rejoindre dans le chat Workadventure.",
        login: "Connexion a Discord",
        fetchingServer: "Récupération de vos serveurs... 👀",
        qrCodeTitle: "Connectez-vous à Discord",
        qrCodeExplainText:
            "Scannez le code QR avec votre application Discord pour vous connecter. Les codes QR sont limités dans le temps, vous devez parfois en régénérer un",
        qrCodeRegenerate: "Re-générer le QR Code",
        loginToken: "Se connecter avec le token",
        sendDiscordToken: "envoyer",
        tokenNeeded: "Vous devez saisir votre jeton Discord. Pour effectuer l'intégration de Discord, consultez",
        howToGetTokenButton: "Comment obtenir mon jeton de connexion Discord",
        loggedIn: "Connecté en tant que",
        saveSync: "Enregistrer et synchroniser 🔌",
        logout: "Se déconnecter",
    },
};

export default externalModule;
