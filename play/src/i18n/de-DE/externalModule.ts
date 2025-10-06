import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "Status ist ok ✅",
        offLine: "Status ist offline ❌",
        warning: "Status ist Warnung ⚠️",
        sync: "Status wird synchronisiert 🔄",
    },
    teams: {
        openingMeeting: "Teams-Meeting wird geöffnet...",
        unableJoinMeeting: "Teams-Meeting kann nicht beigetreten werden!",
        userNotConnected: "Sie sind nicht mit Ihrem Outlook- oder Google-Konto synchronisiert!",
        connectToYourTeams: "Verbinden Sie sich mit Ihrem Outlook- oder Google-Konto 🙏",
        temasAppInfo:
            "Teams ist eine Microsoft 365-App, die Ihrem Team hilft, verbunden und organisiert zu bleiben. Sie können chatten, sich treffen, anrufen und zusammenarbeiten - alles an einem Ort 😍",
        buttonSync: "Meine Teams synchronisieren 🚀",
        buttonConnect: "Meine Teams verbinden 🚀",
    },
    discord: {
        integration: "INTEGRATION",
        explainText:
            "Durch die Verbindung Ihres Discord-Kontos hier können Sie Ihre Nachrichten direkt im WorkAdventure-Chat empfangen. Nach der Synchronisierung eines Servers erstellen wir die darin enthaltenen Räume, denen Sie nur noch im WorkAdventure-Chat beitreten müssen.",
        login: "Mit Discord verbinden",
        fetchingServer: "Ihre Discord-Server werden abgerufen... 👀",
        qrCodeTitle: "Scannen Sie den QR-Code mit Ihrer Discord-App, um sich anzumelden.",
        qrCodeExplainText:
            "Scannen Sie den QR-Code mit Ihrer Discord-App, um sich anzumelden. QR-Codes sind zeitbegrenzt, manchmal müssen Sie einen neuen generieren",
        qrCodeRegenerate: "Neuen QR-Code erstellen",
        tokenInputLabel: "Discord-Token",
        loginToken: "Mit Token anmelden",
        loginTokenExplainText: "Sie müssen Ihren Discord-Token eingeben. Für die Discord-Integration siehe",
        sendDiscordToken: "senden",
        tokenNeeded: "Sie müssen Ihren Discord-Token eingeben. Für die Discord-Integration siehe",
        howToGetTokenButton: "Wie bekomme ich meinen Discord-Login-Token",
        loggedIn: "Verbunden mit:",
        saveSync: "Speichern und synchronisieren",
        logout: "Abmelden",
        guilds: "Discord-Server",
        guildExplain: "Wählen Sie Kanäle aus, die Sie zur WorkAdventure-Chat-Oberfläche hinzufügen möchten.\n",
    },
    outlook: {
        signIn: "Mit Outlook anmelden",
        popupScopeToSync: "Mein Outlook-Konto verbinden",
        popupScopeToSyncExplainText:
            "Wir müssen uns mit Ihrem Outlook-Konto verbinden, um Ihren Kalender und/oder Aufgaben zu synchronisieren. Dadurch können Sie Ihre Meetings und Aufgaben in WorkAdventure anzeigen und direkt von der Karte aus daran teilnehmen.",
        popupScopeToSyncCalendar: "Meinen Kalender synchronisieren",
        popupScopeToSyncTask: "Meine Aufgaben synchronisieren",
        popupCancel: "Abbrechen",
        isSyncronized: "Mit Outlook synchronisiert",
    },
    google: {
        signIn: "Mit Google anmelden",
        popupScopeToSync: "Mein Google-Konto verbinden",
        popupScopeToSyncExplainText:
            "Wir müssen uns mit Ihrem Google-Konto verbinden, um Ihren Kalender und/oder Aufgaben zu synchronisieren. Dadurch können Sie Ihre Meetings und Aufgaben in WorkAdventure anzeigen und direkt von der Karte aus daran teilnehmen.",
        popupScopeToSyncCalendar: "Meinen Kalender synchronisieren",
        popupScopeToSyncTask: "Meine Aufgaben synchronisieren",
        popupCancel: "Abbrechen",
        isSyncronized: "Mit Google synchronisiert",
    },
    calendar: {
        title: "Ihr Meeting heute",
        joinMeeting: "Hier klicken, um dem Meeting beizutreten",
    },
    todoList: {
        title: "Zu erledigen",
        sentence: "Machen Sie eine Pause 🙏 vielleicht einen Kaffee oder Tee? ☕",
    },
};

export default externalModule;
