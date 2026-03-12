import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "Estado correcto ✅",
        offLine: "Estado offline ❌",
        warning: "Estado de advertencia ⚠️",
        sync: "Estado sincronizando 🔄",
    },
    teams: {
        openingMeeting: "Abriendo reunión de Teams...",
        unableJoinMeeting: "¡No se puede unir a la reunión de Teams!",
        userNotConnected: "¡No estás sincronizado con tu cuenta de Outlook o Google!",
        connectToYourTeams: "Conéctate a tu cuenta de Outlook o Google 🙏",
        temasAppInfo:
            "Teams es una aplicación de Microsoft 365 que ayuda a tu equipo a mantenerse conectado y organizado. Puedes chatear, reunirte, llamar y colaborar todo en un solo lugar 😍",
        buttonSync: "Sincronizar Teams 🚀",
        buttonConnect: "Conectar Teams 🚀",
    },
    discord: {
        integration: "INTEGRACIÓN",
        explainText:
            "Al conectar tu cuenta de Discord aquí, podrás recibir tus mensajes directamente en el chat de WorkAdventure. Después de sincronizar un servidor, crearemos las salas que contiene, solo tendrás que unirte a ellas en el chat de WorkAdventure.",
        login: "Conectar con Discord",
        fetchingServer: "Obteniendo tus servidores de Discord... 👀",
        qrCodeTitle: "Escanea el código QR con tu aplicación de Discord para iniciar sesión.",
        qrCodeExplainText:
            "Escanea el código QR con tu aplicación de Discord para iniciar sesión. Los códigos QR tienen límite de tiempo, a veces necesitas regenerar uno",
        qrCodeRegenerate: "Obtener un nuevo código QR",
        tokenInputLabel: "Token de Discord",
        loginToken: "Iniciar sesión con token",
        loginTokenExplainText:
            "Necesitas ingresar tu token de Discord. Para realizar la integración de Discord, consulta",
        sendDiscordToken: "enviar",
        tokenNeeded: "Necesitas ingresar tu token de Discord. Para realizar la integración de Discord, consulta",
        howToGetTokenButton: "Cómo obtener mi token de inicio de sesión de Discord",
        loggedIn: "Conectado como:",
        saveSync: "Guardar y sincronizar",
        logout: "Cerrar sesión",
        back: "Atrás",
        tokenPlaceholder: "Tu token de Discord",
        loginWithQrCode: "Iniciar sesión con código QR",
        guilds: "Servidores de Discord",
        guildExplain: "Selecciona los canales que deseas agregar a la interfaz de chat de WorkAdventure.\n",
    },
    outlook: {
        signIn: "Iniciar sesión con Outlook",
        popupScopeToSync: "Conectar mi cuenta de Outlook",
        popupScopeToSyncExplainText:
            "Necesitamos conectarnos a tu cuenta de Outlook para sincronizar tu calendario y/o tus tareas. Esto te permitirá ver tus reuniones y tareas en WorkAdventure y unirte a ellas directamente desde el mapa.",
        popupScopeToSyncCalendar: "Sincronizar mi calendario",
        popupScopeToSyncTask: "Sincronizar mis tareas",
        popupCancel: "Cancelar",
        isSyncronized: "Sincronizado con Outlook",
        popupScopeIsConnectedExplainText:
            "Ya estás conectado, por favor haz clic en el botón para cerrar sesión y volver a conectar.",
        popupScopeIsConnectedButton: "Cerrar sesión",
        popupErrorTitle: "⚠️ La sincronización del módulo de Outlook o Teams falló",
        popupErrorDescription:
            "La sincronización de inicialización del módulo de Outlook o Teams falló. Para estar conectado, por favor intenta volver a conectar.",
        popupErrorContactAdmin: "Si el problema persiste, por favor contacta a tu administrador.",
        popupErrorShowMore: "Mostrar más información",
        popupErrorMoreInfo1:
            "Podría haber un problema con el proceso de inicio de sesión. Por favor verifica que el proveedor SSO de Azure esté correctamente configurado.",
        popupErrorMoreInfo2:
            'Por favor verifica que el alcance "offline_access" esté habilitado para el proveedor SSO de Azure. Este alcance es necesario para obtener el token de actualización y mantener el módulo de Teams o Outlook conectado.',
    },
    google: {
        signIn: "Iniciar sesión con Google",
        popupScopeToSync: "Conectar mi cuenta de Google",
        popupScopeToSyncExplainText:
            "Necesitamos conectarnos a tu cuenta de Google para sincronizar tu calendario y/o tus tareas. Esto te permitirá ver tus reuniones y tareas en WorkAdventure y unirte a ellas directamente desde el mapa.",
        popupScopeToSyncCalendar: "Sincronizar mi calendario",
        popupScopeToSyncTask: "Sincronizar mis tareas",
        popupCancel: "Cancelar",
        isSyncronized: "Sincronizado con Google",
        popupScopeToSyncMeet: "Crear reuniones en línea",
        openingMeet: "Abriendo Google Meet... 🙏",
        unableJoinMeet: "No se puede unir a Google Meet 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "Creando tu espacio de Google… esto solo tomará unos segundos 💪",
            guestError: "No estás conectado, por lo que no puedes crear un Google Meet 😭",
            guestExplain:
                "Por favor inicia sesión en la plataforma para crear un Google Meet, o pide al propietario que cree uno para ti 🚀",
            error: "Tu configuración de Google Workspace no te permite crear un Meet.",
            errorExplain: "No te preocupes, aún puedes unirte a reuniones cuando alguien más comparta un enlace 🙏",
        },
        popupScopeIsConnectedButton: "Cerrar sesión",
        popupScopeIsConnectedExplainText:
            "Ya estás conectado, por favor haz clic en el botón para cerrar sesión y volver a conectar.",
    },
    calendar: {
        title: "Tu reunión de hoy",
        joinMeeting: "Haz clic aquí para unirte a la reunión",
    },
    todoList: {
        title: "Por hacer",
        sentence: "Tómate un descanso 🙏 ¿quizás un café o té? ☕",
    },
};

export default externalModule;
