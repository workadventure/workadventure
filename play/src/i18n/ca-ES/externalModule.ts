import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "L'estat és correcte ✅",
        offLine: "L'estat està fora de línia ❌",
        warning: "L'estat és d'avís ⚠️",
        sync: "L'estat s'està sincronitzant 🔄",
    },
    teams: {
        openingMeeting: "S'està obrint la reunió de Teams...",
        unableJoinMeeting: "No es pot unir a la reunió de Teams!",
        userNotConnected: "No esteu sincronitzat amb el vostre compte d'Outlook o Google!",
        connectToYourTeams: "Connecteu-vos al vostre compte d'Outlook o Google 🙏",
        temasAppInfo:
            "Teams és una aplicació de Microsoft 365 que ajuda el vostre equip a mantenir-se connectat i organitzat. Podeu xatejar, reunir-vos, trucar i col·laborar tot en un sol lloc 😍",
        buttonSync: "Sincronitzar el meu Teams 🚀",
        buttonConnect: "Connectar el meu Teams 🚀",
    },
    discord: {
        integration: "INTEGRACIÓ",
        explainText:
            "En connectar el vostre compte de Discord aquí, podreu rebre els vostres missatges directament al xat de Workadventure. Després de sincronitzar un servidor, crearem les sales que conté, només haureu d'unir-vos-hi al xat de Workadventure.",
        login: "Connectar a Discord",
        fetchingServer: "Obtenint els vostres servidors de Discord... 👀",
        qrCodeTitle: "Escanegeu el codi QR amb la vostra aplicació de Discord per iniciar sessió.",
        qrCodeExplainText:
            "Escanegeu el codi QR amb la vostra aplicació de Discord per iniciar sessió. Els codis QR tenen temps limitat, a vegades cal regenerar-ne un",
        qrCodeRegenerate: "Obtenir un nou codi QR",
        tokenInputLabel: "Token de Discord",
        loginToken: "Iniciar sessió amb token",
        loginTokenExplainText:
            "Cal introduir el vostre token de Discord. Per realitzar la integració de Discord, vegeu",
        sendDiscordToken: "enviar",
        tokenNeeded: "Cal introduir el vostre token de Discord. Per realitzar la integració de Discord, vegeu",
        howToGetTokenButton: "Com obtenir el meu token d'inici de sessió de Discord",
        loggedIn: "Connectat amb:",
        saveSync: "Desar i sincronitzar",
        logout: "Tancar sessió",
        guilds: "Servidors de Discord",
        guildExplain: "Seleccioneu els canals que voleu afegir a la interfície de xat de Workadventure.\n",
    },
    outlook: {
        signIn: "Iniciar sessió amb Outlook",
        popupScopeToSync: "Connectar el meu compte d'Outlook",
        popupScopeToSyncExplainText:
            "Necessitem connectar-nos al vostre compte d'Outlook per sincronitzar el vostre calendari i/o tasques. Això us permetrà veure les vostres reunions i tasques a WorkAdventure i unir-vos-hi directament des del mapa.",
        popupScopeToSyncCalendar: "Sincronitzar el meu calendari",
        popupScopeToSyncTask: "Sincronitzar les meves tasques",
        popupCancel: "Cancel·lar",
        isSyncronized: "Sincronitzat amb Outlook",
        popupScopeIsConnectedExplainText:
            "Ja esteu connectat, feu clic al botó per tancar sessió i tornar-vos a connectar.",
        popupScopeIsConnectedButton: "Tancar sessió",
        popupErrorTitle: "⚠️ La sincronització del mòdul Outlook o Teams ha fallat",
        popupErrorDescription:
            "La sincronització d'inicialització del mòdul Outlook o Teams ha fallat. Per estar connectat, proveu de tornar-vos a connectar.",
        popupErrorContactAdmin: "Si el problema persisteix, contacteu amb el vostre administrador.",
        popupErrorShowMore: "Mostrar més informació",
        popupErrorMoreInfo1:
            "Podria haver-hi un problema amb el procés d'inici de sessió. Comproveu que el proveïdor SSO Azure estigui configurat correctament.",
        popupErrorMoreInfo2:
            "Comproveu que l'àmbit \"offline_access\" estigui habilitat per al proveïdor SSO Azure. Aquest àmbit és necessari per obtenir el token d'actualització i mantenir connectat el mòdul Teams o Outlook.",
    },
    google: {
        signIn: "Iniciar sessió amb Google",
        popupScopeToSync: "Connectar el meu compte de Google",
        popupScopeToSyncExplainText:
            "Necessitem connectar-nos al vostre compte de Google per sincronitzar el vostre calendari i/o tasques. Això us permetrà veure les vostres reunions i tasques a WorkAdventure i unir-vos-hi directament des del mapa.",
        popupScopeToSyncCalendar: "Sincronitzar el meu calendari",
        popupScopeToSyncTask: "Sincronitzar les meves tasques",
        popupCancel: "Cancel·lar",
        isSyncronized: "Sincronitzat amb Google",
        popupScopeToSyncMeet: "Crear reunions en línia",
        openingMeet: "S'està obrint Google Meet... 🙏",
        unableJoinMeet: "No es pot unir a Google Meet 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "S'està creant el vostre espai de Google… això només prendrà uns segons 💪",
            guestError: "No esteu connectat, per tant no podeu crear un Google Meet 😭",
            guestExplain:
                "Siusplau, inicieu sessió a la plataforma per crear un Google Meet, o demaneu al propietari que en creï un per a vosaltres 🚀",
            error: "La configuració del vostre Google Workspace no us permet crear un Meet.",
            errorExplain: "No us preocupeu, encara podeu unir-vos a reunions quan algú altre comparteix un enllaç 🙏",
        },
        popupScopeIsConnectedButton: "Tancar sessió",
        popupScopeIsConnectedExplainText:
            "Ja esteu connectat, feu clic al botó per tancar sessió i tornar-vos a connectar.",
    },
    calendar: {
        title: "Les vostres reunions avui",
        joinMeeting: "Feu clic aquí per unir-vos a la reunió",
    },
    todoList: {
        title: "Per fer",
        sentence: "Fes una pausa 🙏 potser un cafè o te? ☕",
    },
};

export default externalModule;
