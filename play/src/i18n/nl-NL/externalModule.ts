import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "Status is ok ✅",
        offLine: "Status is offline ❌",
        warning: "Status is waarschuwing ⚠️",
        sync: "Status wordt gesynchroniseerd 🔄",
    },
    teams: {
        openingMeeting: "Teams-vergadering openen...",
        unableJoinMeeting: "Kan niet deelnemen aan Teams-vergadering!",
        userNotConnected: "U bent niet gesynchroniseerd met uw Outlook- of Google-account!",
        connectToYourTeams: "Verbind met uw Outlook- of Google-account 🙏",
        temasAppInfo:
            "Teams is een Microsoft 365-app die uw team helpt verbonden en georganiseerd te blijven. U kunt chatten, vergaderen, bellen en samenwerken op één plek 😍",
        buttonSync: "Mijn Teams synchroniseren 🚀",
        buttonConnect: "Mijn Teams verbinden 🚀",
    },
    discord: {
        integration: "INTEGRATIE",
        explainText:
            "Door uw Discord-account hier te verbinden, kunt u uw berichten rechtstreeks in de Workadventure-chat ontvangen. Na het synchroniseren van een server, maken we de kamers die deze bevat, u hoeft zich alleen maar bij hen aan te sluiten in de Workadventure-chat.",
        login: "Verbind met Discord",
        fetchingServer: "Uw Discord-servers ophalen... 👀",
        qrCodeTitle: "Scan de QR-code met uw Discord-app om in te loggen.",
        qrCodeExplainText:
            "Scan de QR-code met uw Discord-app om in te loggen. QR-codes zijn tijdelijk beperkt, soms moet u er een opnieuw genereren",
        qrCodeRegenerate: "Nieuwe QR-code ophalen",
        tokenInputLabel: "Discord-token",
        loginToken: "Inloggen met token",
        loginTokenExplainText: "U moet uw Discord-token invoeren. Om Discord-integratie uit te voeren, zie",
        sendDiscordToken: "verzenden",
        tokenNeeded: "U moet uw Discord-token invoeren. Om Discord-integratie uit te voeren, zie",
        howToGetTokenButton: "Hoe krijg ik mijn Discord-logintoken",
        loggedIn: "Verbonden met:",
        saveSync: "Opslaan en synchroniseren",
        logout: "Uitloggen",
        guilds: "Discord-servers",
        guildExplain: "Selecteer de kanalen die u wilt toevoegen aan de Workadventure-chatinterface.\n",
    },
    outlook: {
        signIn: "Inloggen met Outlook",
        popupScopeToSync: "Mijn Outlook-account verbinden",
        popupScopeToSyncExplainText:
            "We moeten verbinding maken met uw Outlook-account om uw agenda en/of taken te synchroniseren. Dit stelt u in staat om uw vergaderingen en taken in WorkAdventure te bekijken en er direct vanuit de kaart aan deel te nemen.",
        popupScopeToSyncCalendar: "Mijn agenda synchroniseren",
        popupScopeToSyncTask: "Mijn taken synchroniseren",
        popupCancel: "Annuleren",
        isSyncronized: "Gesynchroniseerd met Outlook",
        popupScopeIsConnectedExplainText:
            "U bent al verbonden, klik op de knop om uit te loggen en opnieuw te verbinden.",
        popupScopeIsConnectedButton: "Uitloggen",
        popupErrorTitle: "⚠️ Synchronisatie van Outlook- of Teams-module is mislukt",
        popupErrorDescription:
            "De initialisatiesynchronisatie van de Outlook- of Teams-module is mislukt. Om verbonden te zijn, probeer opnieuw verbinding te maken.",
        popupErrorContactAdmin: "Als het probleem aanhoudt, neem dan contact op met uw beheerder.",
        popupErrorShowMore: "Meer informatie weergeven",
        popupErrorMoreInfo1:
            "Er kan een probleem zijn met het aanmeldproces. Controleer of de SSO Azure-provider correct is geconfigureerd.",
        popupErrorMoreInfo2:
            'Controleer of de scope "offline_access" is ingeschakeld voor de SSO Azure-provider. Deze scope is vereist om het vernieuwingstoken te krijgen en de Teams- of Outlook-module verbonden te houden.',
    },
    google: {
        signIn: "Inloggen met Google",
        popupScopeToSync: "Mijn Google-account verbinden",
        popupScopeToSyncExplainText:
            "We moeten verbinding maken met uw Google-account om uw agenda en/of taken te synchroniseren. Dit stelt u in staat om uw vergaderingen en taken in WorkAdventure te bekijken en er direct vanuit de kaart aan deel te nemen.",
        popupScopeToSyncCalendar: "Mijn agenda synchroniseren",
        popupScopeToSyncTask: "Mijn taken synchroniseren",
        popupCancel: "Annuleren",
        isSyncronized: "Gesynchroniseerd met Google",
        popupScopeToSyncMeet: "Online vergaderingen maken",
        openingMeet: "Google Meet openen... 🙏",
        unableJoinMeet: "Kan niet deelnemen aan Google Meet 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "Uw Google-ruimte wordt aangemaakt… dit duurt slechts een paar seconden 💪",
            guestError: "U bent niet verbonden, dus u kunt geen Google Meet maken 😭",
            guestExplain:
                "Log in op het platform om een Google Meet te maken, of vraag de eigenaar om er een voor u te maken 🚀",
            error: "Uw Google Workspace-instellingen staan het maken van een Meet niet toe.",
            errorExplain:
                "Geen zorgen, u kunt nog steeds deelnemen aan vergaderingen wanneer iemand anders een link deelt 🙏",
        },
        popupScopeIsConnectedButton: "Uitloggen",
        popupScopeIsConnectedExplainText:
            "U bent al verbonden, klik op de knop om uit te loggen en opnieuw te verbinden.",
    },
    calendar: {
        title: "Uw vergadering vandaag",
        joinMeeting: "Klik hier om deel te nemen aan de vergadering",
    },
    todoList: {
        title: "Te doen",
        sentence: "Neem een pauze 🙏 misschien een kopje koffie of thee? ☕",
    },
};

export default externalModule;
