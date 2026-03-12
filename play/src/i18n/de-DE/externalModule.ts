import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "Status ist ok ✅",
        offLine: "Status ist offline ❌",
        warning: "Status ist Warnung ⚠️",
        sync: "Status wird synchronisiert 🔄",
    },
    teams: {
        openingMeeting: "Teams-Meeting wird geöffnet...",
        unableJoinMeeting: "Kann nicht am Teams-Meeting teilnehmen!",
        userNotConnected: "Sie sind nicht mit Ihrem Outlook- oder Google-Konto synchronisiert!",
        connectToYourTeams: "Verbinden Sie sich mit Ihrem Outlook- oder Google-Konto 🙏",
        temasAppInfo:
            "Teams ist eine Microsoft 365-App, die Ihrem Team hilft, verbunden und organisiert zu bleiben. Sie können chatten, sich treffen, anrufen und an einem Ort zusammenarbeiten 😍",
        buttonSync: "Meine Teams synchronisieren 🚀",
        buttonConnect: "Meine Teams verbinden 🚀",
    },
    discord: {
        back: "Back",
        tokenPlaceholder: "Ihr Discord-Token",
        integration: "INTEGRATION",
        explainText:
            "Durch die Verbindung Ihres Discord-Kontos hier können Sie Ihre Nachrichten direkt im Workadventure-Chat erhalten. Nach der Synchronisierung eines Servers erstellen wir die darin enthaltenen Räume, Sie müssen ihnen nur im Workadventure-Chat beitreten.",
        login: "Mit Discord verbinden",
        fetchingServer: "Ihre Discord-Server werden abgerufen... 👀",
        loginWithQrCode: "Mit QR-Code anmelden",
        qrCodeTitle: "Scannen Sie den QR-Code mit Ihrer Discord-App, um sich anzumelden.",
        qrCodeExplainText:
            "Scannen Sie den QR-Code mit Ihrer Discord-App, um sich anzumelden. QR-Codes sind zeitlich begrenzt, manchmal müssen Sie einen neu generieren",
        qrCodeRegenerate: "Neuen QR-Code abrufen",
        tokenInputLabel: "Discord-Token",
        loginToken: "Mit Token anmelden",
        loginTokenExplainText:
            "Sie müssen Ihren Discord-Token eingeben. Um die Discord-Integration durchzuführen, siehe",
        sendDiscordToken: "senden",
        tokenNeeded: "Sie müssen Ihren Discord-Token eingeben. Um die Discord-Integration durchzuführen, siehe",
        howToGetTokenButton: "Wie erhalte ich mein Discord-Anmeldetoken",
        loggedIn: "Verbunden mit:",
        saveSync: "Speichern und synchronisieren",
        logout: "Abmelden",
        guilds: "Discord-Server",
        guildExplain: "Wählen Sie die Kanäle aus, die Sie zur Workadventure-Chat-Oberfläche hinzufügen möchten.\n",
    },
    outlook: {
        signIn: "Mit Outlook anmelden",
        popupScopeToSync: "Mein Outlook-Konto verbinden",
        popupScopeToSyncExplainText:
            "Wir müssen uns mit Ihrem Outlook-Konto verbinden, um Ihren Kalender und/oder Ihre Aufgaben zu synchronisieren. Dies ermöglicht es Ihnen, Ihre Besprechungen und Aufgaben in WorkAdventure anzuzeigen und direkt von der Karte aus daran teilzunehmen.",
        popupScopeToSyncCalendar: "Meinen Kalender synchronisieren",
        popupScopeToSyncTask: "Meine Aufgaben synchronisieren",
        popupCancel: "Abbrechen",
        isSyncronized: "Mit Outlook synchronisiert",
        popupScopeIsConnectedExplainText:
            "Sie sind bereits verbunden, bitte klicken Sie auf die Schaltfläche, um sich abzumelden und erneut zu verbinden.",
        popupScopeIsConnectedButton: "Abmelden",
        popupErrorTitle: "⚠️ Die Synchronisierung des Outlook- oder Teams-Moduls ist fehlgeschlagen",
        popupErrorDescription:
            "Die Initialisierungssynchronisierung des Outlook- oder Teams-Moduls ist fehlgeschlagen. Um verbunden zu sein, versuchen Sie bitte, sich erneut zu verbinden.",
        popupErrorContactAdmin: "Wenn das Problem weiterhin besteht, wenden Sie sich bitte an Ihren Administrator.",
        popupErrorShowMore: "Weitere Informationen anzeigen",
        popupErrorMoreInfo1:
            "Es könnte ein Problem mit dem Anmeldevorgang geben. Bitte überprüfen Sie, ob der SSO Azure-Anbieter korrekt konfiguriert ist.",
        popupErrorMoreInfo2:
            'Bitte überprüfen Sie, ob der Bereich "offline_access" für den SSO Azure-Anbieter aktiviert ist. Dieser Bereich ist erforderlich, um das Aktualisierungstoken zu erhalten und das Teams- oder Outlook-Modul verbunden zu halten.',
    },
    google: {
        signIn: "Mit Google anmelden",
        popupScopeToSync: "Mein Google-Konto verbinden",
        popupScopeToSyncExplainText:
            "Wir müssen uns mit Ihrem Google-Konto verbinden, um Ihren Kalender und/oder Ihre Aufgaben zu synchronisieren. Dies ermöglicht es Ihnen, Ihre Besprechungen und Aufgaben in WorkAdventure anzuzeigen und direkt von der Karte aus daran teilzunehmen.",
        popupScopeToSyncCalendar: "Meinen Kalender synchronisieren",
        popupScopeToSyncTask: "Meine Aufgaben synchronisieren",
        popupCancel: "Abbrechen",
        isSyncronized: "Mit Google synchronisiert",
        popupScopeToSyncMeet: "Online-Meetings erstellen",
        openingMeet: "Google Meet wird geöffnet... 🙏",
        unableJoinMeet: "Kann nicht an Google Meet teilnehmen 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "Ihr Google-Bereich wird erstellt… das dauert nur ein paar Sekunden 💪",
            guestError: "Sie sind nicht verbunden, daher können Sie kein Google Meet erstellen 😭",
            guestExplain:
                "Bitte melden Sie sich auf der Plattform an, um ein Google Meet zu erstellen, oder bitten Sie den Eigentümer, eines für Sie zu erstellen 🚀",
            error: "Ihre Google Workspace-Einstellungen erlauben es Ihnen nicht, ein Meet zu erstellen.",
            errorExplain:
                "Keine Sorge, Sie können sich weiterhin Meetings anschließen, wenn jemand anderes einen Link teilt 🙏",
        },
        popupScopeIsConnectedButton: "Abmelden",
        popupScopeIsConnectedExplainText:
            "Sie sind bereits verbunden, bitte klicken Sie auf die Schaltfläche, um sich abzumelden und erneut zu verbinden.",
    },
    calendar: {
        title: "Ihre Besprechung heute",
        joinMeeting: "Klicken Sie hier, um an der Besprechung teilzunehmen",
    },
    todoList: {
        title: "Zu erledigen",
        sentence: "Machen Sie eine Pause 🙏 vielleicht einen Kaffee oder Tee? ☕",
    },
};

export default externalModule;
