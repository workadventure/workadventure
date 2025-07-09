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
        userNotConnected: "Vous n'êtes pas syncronisé avec votre compte Outlook ou Google!",
        connectToYourTeams: "Connectez-vous à votre compte Outllok ou Google 🙏",
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
    outlook: {
        signIn: "Se connecter avec Outlook",
        popupScopeToSync: "Connecter mon compte Outlook",
        popupScopeToSyncExplainText:
            "Nous avons besoin de nous connecter à votre compte Outlook pour synchroniser votre calendrier et / ou vos tâches. Cela vous permettra de voir vos réunions et vos tâches dans WorkAdventure et de les rejoindre directement depuis la carte.",
        popupScopeToSyncCalendar: "Synchroniser mon calendrier",
        popupScopeToSyncTask: "Synchroniser mes tâches",
        popupCancel: "Annuler",
        isSyncronized: "Synchronisé avec Outlook",
    },
    google: {
        signIn: "Se connecter avec Google",
        popupScopeToSync: "Connecter mon compte Google",
        popupScopeToSyncExplainText:
            "Nous avons besoin de nous connecter à votre compte Google pour synchroniser votre calendrier et / ou vos tâches. Cela vous permettra de voir vos réunions et vos tâches dans WorkAdventure et de les rejoindre directement depuis la carte.",
        popupScopeToSyncCalendar: "Synchroniser mon calendrier",
        popupScopeToSyncTask: "Synchroniser mes tâches",
        popupCancel: "Annuler",
        isSyncronized: "Synchronisé avec Google",
    },
};

export default externalModule;
