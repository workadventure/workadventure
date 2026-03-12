import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "Status je w porjadku ✅",
        offLine: "Status offline ❌",
        warning: "Status warnowanje ⚠️",
        sync: "Status synchronizuje so 🔄",
    },
    teams: {
        openingMeeting: "Teams-zećělenje so wočinje...",
        unableJoinMeeting: "Njeda so na Teams-zećělenju wobdźělić!",
        userNotConnected: "Njejsy z wašim Outlook-abo Google-kontom synchronizowany!",
        connectToYourTeams: "Zwjazaj so z wašim Outlook-abo Google-kontom 🙏",
        temasAppInfo:
            "Teams je Microsoft 365-nałožka, kotraž wam pomha, waš team zwjazany a organizowany dźeržeć. Móžeće chatować, so stakać, wołać a na jednim městnje sobu dźěłać 😍",
        buttonSync: "Moje Teams synchronizować 🚀",
        buttonConnect: "Moje Teams zwjazać 🚀",
    },
    discord: {
        integration: "INTEGRACIJA",
        explainText:
            "Hdyž zwjazujeće waše Discord-konto tu, budźeće móhli swoje powěsće direktnje w Workadventure-ćatje dóstać. Po synchronizowanju serwera załožimy runiny, kotrež wobsahuje, dyrbiće jenož k nim w Workadventure-ćatje přiwstupać.",
        login: "Z Discord zwjazać",
        fetchingServer: "Waše Discord-serwery so wotwołuja... 👀",
        qrCodeTitle: "Skannujće QR-kod z wašej Discord-nałožku, zo by so přizjewił.",
        qrCodeExplainText:
            "Skannujće QR-kod z wašej Discord-nałožku, zo by so přizjewił. QR-kody su časowe wobmjezowane, wóterhi dyrbiće jón znowa generować",
        qrCodeRegenerate: "Nowy QR-kod wotwołać",
        tokenInputLabel: "Discord-token",
        loginToken: "Z tokenom so přizjewić",
        loginTokenExplainText: "Dyrbiće swój Discord-token zapodać. Zo by Discord-integraciju wuwjedł, hlejće",
        sendDiscordToken: "słać",
        tokenNeeded: "Dyrbiće swój Discord-token zapodać. Zo by Discord-integraciju wuwjedł, hlejće",
        howToGetTokenButton: "Kak móhł swoj Discord-přizjewjeński token dóstać",
        loggedIn: "Zwjazany z:",
        saveSync: "Składować a synchronizować",
        logout: "Wotzjewić",
        back: "Wróćo",
        tokenPlaceholder: "Waš Discord-token",
        loginWithQrCode: "Z QR-kodom so přizjewić",
        guilds: "Discord-serwery",
        guildExplain: "Wubjerće kanale, kotrež chceće k Workadventure-ćat-interfejsej přidać.\n",
    },
    outlook: {
        signIn: "Z Outlook so přizjewić",
        popupScopeToSync: "Moje Outlook-konto zwjazać",
        popupScopeToSyncExplainText:
            "Dyrbimy so z wašim Outlook-kontom zwjazać, zo by waš kalender a/abo nadawki synchronizował. To wam zmóžnja, waše zećělenja a nadawki w WorkAdventure widźeć a direktnje z kartow k nim wobdźělić.",
        popupScopeToSyncCalendar: "Mój kalender synchronizować",
        popupScopeToSyncTask: "Moje nadawki synchronizować",
        popupCancel: "Přetorhnyć",
        isSyncronized: "Z Outlook synchronizowany",
        popupScopeIsConnectedExplainText:
            "Sće hižo zwjazany, klikńće na tłóčatko, zo by so wotzjewił a znowa zwjazował.",
        popupScopeIsConnectedButton: "Wotzjewić",
        popupErrorTitle: "⚠️ Synchronizowanje Outlook-abo Teams-modula je so njeporadźiło",
        popupErrorDescription:
            "Inicializaciske synchronizowanje Outlook-abo Teams-modula je so njeporadźiło. Zo by zwjazany był, spytajće prošu znowa zwjazać.",
        popupErrorContactAdmin: "Jeli problem dale eksistuje, stajće so prošu z wašim administratorom do zwiska.",
        popupErrorShowMore: "Wjace informacijow pokazać",
        popupErrorMoreInfo1:
            "Móže problem z přizjewjenskim procesom być. Prošu přepruwujće, hač SSO Azure-dodawar korektnje konfigurowany je.",
        popupErrorMoreInfo2:
            'Prošu přepruwujće, hač wobwod "offline_access" za SSO Azure-dodawar zmóžnjeny je. Tutón wobwod je trěbny, zo by aktualizowanski token dóstał a Teams-abo Outlook-modul zwjazany dźeržał.',
    },
    google: {
        signIn: "Z Google so přizjewić",
        popupScopeToSync: "Moje Google-konto zwjazać",
        popupScopeToSyncExplainText:
            "Dyrbimy so z wašim Google-kontom zwjazać, zo by waš kalender a/abo nadawki synchronizował. To wam zmóžnja, waše zećělenja a nadawki w WorkAdventure widźeć a direktnje z kartow k nim wobdźělić.",
        popupScopeToSyncCalendar: "Mój kalender synchronizować",
        popupScopeToSyncTask: "Moje nadawki synchronizować",
        popupCancel: "Přetorhnyć",
        isSyncronized: "Z Google synchronizowany",
        popupScopeToSyncMeet: "Online-zećělenja wutworić",
        openingMeet: "Google Meet so wočinje... 🙏",
        unableJoinMeet: "Njeda so na Google Meet wobdźělić 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "Waš Google-rum so wutworja… to budźe jenož wjacore sekundy trać 💪",
            guestError: "Njejsće zwjazany, tohodla njemóžeće Google Meet wutworić 😭",
            guestExplain:
                "Prošu přizjewće so na platformje, zo by Google Meet wutworił, abo prosće wobsedźerja, zo by za was jón wutworil 🚀",
            error: "Nastajenja wašeho Google Workspace wam njedowoluja Meet wutworić.",
            errorExplain: "Žane starosće, móžeće hišće na zećělenja wobdźělić, hdyž něchtó druhi wotkaz dźěli 🙏",
        },
        popupScopeIsConnectedButton: "Wotzjewić",
        popupScopeIsConnectedExplainText:
            "Sće hižo zwjazany, klikńće na tłóčatko, zo by so wotzjewił a znowa zwjazował.",
    },
    calendar: {
        title: "Waše zećělenje dźensa",
        joinMeeting: "Klikńće tu, zo by na zećělenju wobdźělić",
    },
    todoList: {
        title: "Činić",
        sentence: "Mějće pauzu 🙏 snadź kofej abo čaj? ☕",
    },
};

export default externalModule;
