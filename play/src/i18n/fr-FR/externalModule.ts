import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

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
        tokenInputLabel: "Jeton Discord",
        loginToken: "Se connecter avec le token",
        loginTokenExplainText:
            "Vous devez saisir votre jeton Discord. Pour effectuer l'intégration de Discord, consultez",
        sendDiscordToken: "Envoyer",
        tokenNeeded: "Vous devez saisir votre jeton Discord. Pour effectuer l'intégration de Discord, consultez",
        howToGetTokenButton: "Comment obtenir mon jeton de connexion Discord",
        loggedIn: "Connecté en tant que",
        saveSync: "Enregistrer et synchroniser 🔌",
        logout: "Se déconnecter",
        back: "Retour",
        tokenPlaceholder: "Votre jeton Discord",
        loginWithQrCode: "Se connecter avec le code QR",
        guilds: "Serveurs Discord",
        guildExplain: "Sélectionnez les canaux que vous souhaitez ajouter à l'interface de chat WorkAdventure.\n",
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
        popupScopeIsConnectedExplainText:
            "Vous êtes déjà connecté, veuillez cliquer sur le bouton pour vous déconnecter et vous reconnecter.",
        popupScopeIsConnectedButton: "Se déconnecter",
        popupErrorTitle: "⚠️ La synchronisation du module Outlook ou Teams a échoué",
        popupErrorDescription:
            "La synchronisation d'initialisation du module Outlook ou Teams a échoué. Pour être connecté, veuillez essayer de vous reconnecter.",
        popupErrorContactAdmin: "Si le problème persiste, veuillez contacter votre administrateur.",
        popupErrorShowMore: "Afficher plus d'informations",
        popupErrorMoreInfo1:
            "Il pourrait y avoir un problème avec le processus de connexion. Veuillez vérifier que le fournisseur SSO Azure est correctement configuré.",
        popupErrorMoreInfo2:
            'Veuillez vérifier que la portée "offline_access" est activée pour le fournisseur SSO Azure. Cette portée est requise pour obtenir le jeton d\'actualisation et maintenir le module Teams ou Outlook connecté.',
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
        popupScopeToSyncMeet: "Créer des réunions en ligne",
        openingMeet: "Ouverture de Google Meet... 🙏",
        unableJoinMeet: "Impossible de rejoindre Google Meet 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "Création de votre espace Google… cela ne prendra qu’un instant 💪",
            guestError: "Vous n’êtes pas connecté, vous ne pouvez donc pas créer de Google Meet 😭",
            guestExplain:
                "Veuillez vous connecter à la plateforme pour créer un Google Meet, ou demandez au propriétaire d’en créer un pour vous 🚀",
            error: "Les paramètres de votre Google Workspace ne vous permettent pas de créer un Meet.",
            errorExplain:
                "Pas d'inquiétude, vous pouvez toujours rejoindre une réunion lorsque quelqu'un partage un lien 🙏",
        },
        popupScopeIsConnectedButton: "Se déconnecter",
        popupScopeIsConnectedExplainText:
            "Vous êtes déjà connecté, veuillez cliquer sur le bouton pour vous déconnecter et vous reconnecter.",
    },
    calendar: {
        title: "Vos réunions aujourd’hui",
        joinMeeting: "Cliquez ici pour rejoindre la réunion",
    },
    todoList: {
        title: "À faire",
        sentence: "Faites une pause 🙏 peut-être un café ou un thé ? ☕",
    },
};

export default externalModule;
