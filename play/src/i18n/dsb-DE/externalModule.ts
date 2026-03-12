import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "Status jo w porjadku ✅",
        offLine: "Status offline ❌",
        warning: "Status warnowanje ⚠️",
        sync: "Status synchronizěrujo se 🔄",
    },
    teams: {
        openingMeeting: "Teams-ześělenje se wótwórijo...",
        unableJoinMeeting: "Njamóžośo pśi Teams-ześělenju pśiźoś!",
        userNotConnected: "Njejsćo ze swójim Outlook-abo Google-kontom synchronizěrowany!",
        connectToYourTeams: "Zwězajśo se ze swójim Outlook-abo Google-kontom 🙏",
        temasAppInfo:
            "Teams jo Microsoft 365-nałoženje, kótarež wam pomaga, waš team zwězany a organizěrowany źaržaś. Móžośo chatowaś, se stakaś, wołowaś a w jadnem městnje ze sobubuźowaś 😍",
        buttonSync: "Móje Teams synchronizěrowaś 🚀",
        buttonConnect: "Móje Teams zwězaś 🚀",
    },
    discord: {
        integration: "INTEGRACIJA",
        explainText:
            "Gaž zwězujośo swójo Discord-konto how, buźośo mócy swóje powěsći direktnje w Workadventure-chatje dostaś. Pó synchronizěrowanju serwera napóraju mej rumniny, kótarež wopśimujo, musyśo jenjez k nim w Workadventure-chatje pśiźoś.",
        login: "Z Discord zwězaś",
        fetchingServer: "Waše Discord-serwery se wótwołuju... 👀",
        qrCodeTitle: "Skennujśo QR-kod ze swójeju Discord-nałožku, aby se pśizjawił.",
        qrCodeExplainText:
            "Skennujśo QR-kod ze swójeju Discord-nałožku, aby se pśizjawił. QR-kody su casowe wobgranicowane, wótergi musyśo jen znowego generěrowaś",
        qrCodeRegenerate: "Nowy QR-kod wótwołaś",
        tokenInputLabel: "Discord-token",
        loginToken: "Z tokenom se pśizjawiś",
        loginTokenExplainText: "Musyśo swój Discord-token zapódaś. Aby Discord-integraciju wuwjadł, glědajśo",
        sendDiscordToken: "słaś",
        tokenNeeded: "Musyśo swój Discord-token zapódaś. Aby Discord-integraciju wuwjadł, glědajśo",
        howToGetTokenButton: "Kak mógu swój Discord-pśizjawjeński token dostaś",
        loggedIn: "Zwězany z:",
        saveSync: "Składowaś a synchronizěrowaś",
        logout: "Wótzjawiś",
        back: "Slědk",
        tokenPlaceholder: "Waš Discord-token",
        loginWithQrCode: "Z QR-kodom se pśizjawiś",
        guilds: "Discord-serwery",
        guildExplain: "Wubjeŕśo kanale, kótarež cośo k Workadventure-chat-interfejsoju pśidaś.\n",
    },
    outlook: {
        signIn: "Z Outlook se pśizjawiś",
        popupScopeToSync: "Mójo Outlook-konto zwězaś",
        popupScopeToSyncExplainText:
            "Musymy se z wašym Outlook-kontom zwězaś, aby waš kalendaŕ a/abo nadawki synchronizěrował. To wam zmóžnijo, waše ześělenja a nadawki w WorkAdventure wiźeś a direktnje z kórtow k nim pśiźoś.",
        popupScopeToSyncCalendar: "Mój kalendaŕ synchronizěrowaś",
        popupScopeToSyncTask: "Móje nadawki synchronizěrowaś",
        popupCancel: "Pśetergnuś",
        isSyncronized: "Z Outlook synchronizěrowany",
        popupScopeIsConnectedExplainText: "Sćo južo zwězany, klikniśo na tłocašk, aby se wótzjawił a znowego zwězał.",
        popupScopeIsConnectedButton: "Wótzjawiś",
        popupErrorTitle: "⚠️ Synchronizěrowanje Outlook-abo Teams-modula jo se njeraźiło",
        popupErrorDescription:
            "Inicializaciske synchronizěrowanje Outlook-abo Teams-modula jo se njeraźiło. Aby zwězany był, wopytajśo se pšosym znowego zwězaś.",
        popupErrorContactAdmin: "Jolic problem dalej eksistěrujo, pšosym stajśo se z wašym administratorom do zwiska.",
        popupErrorShowMore: "Wěcej informacijow pokazaś",
        popupErrorMoreInfo1:
            "Móžo problem z pśizjawjeńskim procesom byś. Pšosym pśeglědajśo, lěc SSO Azure-dodawaŕ korektnje konfigurěrowany jo.",
        popupErrorMoreInfo2:
            'Pšosym pśeglědajśo, lěc wobcerk "offline_access" za SSO Azure-dodawaŕ zmóžnjony jo. Toś ten wobcerk jo trěbny, aby aktualizěrowański token dostał a Teams-abo Outlook-modul zwězany źaržał.',
    },
    google: {
        signIn: "Z Google se pśizjawiś",
        popupScopeToSync: "Mójo Google-konto zwězaś",
        popupScopeToSyncExplainText:
            "Musymy se z wašym Google-kontom zwězaś, aby waš kalendaŕ a/abo nadawki synchronizěrował. To wam zmóžnijo, waše ześělenja a nadawki w WorkAdventure wiźeś a direktnje z kórtow k nim pśiźoś.",
        popupScopeToSyncCalendar: "Mój kalendaŕ synchronizěrowaś",
        popupScopeToSyncTask: "Móje nadawki synchronizěrowaś",
        popupCancel: "Pśetergnuś",
        isSyncronized: "Z Google synchronizěrowany",
        popupScopeToSyncMeet: "Online-ześělenja napóraś",
        openingMeet: "Google Meet se wótwórijo... 🙏",
        unableJoinMeet: "Njamóžośo k Google Meet pśiźoś 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "Wašo Google-rum se napórajo… to buźo jano někotare sekundy traś 💪",
            guestError: "Njejsćo zwězany, tak to njamóžośo Google Meet napóraś 😭",
            guestExplain:
                "Pšosym pśizjawśo se na platformje, aby Google Meet napórał, abo pšosćo wóbsebnika, aby za was jaden napórał 🚀",
            error: "Nastajenja wašogo Google Workspace njedowóluju wam Meet napóraś.",
            errorExplain: "Žedne starosći, móžośo wósebnje na ześělenja pśiźoś, gaž něchten drugi wótkaz źěli 🙏",
        },
        popupScopeIsConnectedButton: "Wótzjawiś",
        popupScopeIsConnectedExplainText: "Sćo južo zwězany, klikniśo na tłocašk, aby se wótzjawił a znowego zwězał.",
    },
    calendar: {
        title: "Waše ześělenje źěńs",
        joinMeeting: "Klikniśo how, aby na ześělenju pśiźoś",
    },
    todoList: {
        title: "Tuchylu cyniś",
        sentence: "Mějśo pauzu 🙏 snaź kafe abo tšoj? ☕",
    },
};

export default externalModule;
