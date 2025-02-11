import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    title: "Menú",
    icon: {
        open: {
            menu: "Abrir menú",
            invite: "Mostrar invitación",
            register: "Registro",
            chat: "Abrir chat",
            userlist: "Lista de usuarios",
            openEmoji: "Abrir emoji emergente seleccionado",
            closeEmoji: "Cerrar el menú de emojis",
            mobile: "Abrir menú móvil",
            calendar: "Abrir calendario",
        },
    },
    visitCard: {
        close: "Cerrar",
    },
    profile: {
        login: "Iniciar sesión",
        logout: "Cerrar sesión",
    },
    settings: {
        videoBandwidth: {
            title: "Calidad de video",
            low: "Baja",
            recommended: "Recomendada",
            unlimited: "Ilimitada",
        },
        shareScreenBandwidth: {
            title: "Calidad de compartir pantalla",
            low: "Baja",
            recommended: "Recomendada",
            unlimited: "Ilimitada",
        },
        language: {
            title: "Idioma",
        },
        privacySettings: {
            title: "Modo no presente",
            explanation:
                'Cuando la pestaña de WorkAdventure en su navegador no es visible, WorkAdventure cambia a "modo no presente"',
            cameraToggle: 'Mantener la cámara activa en "modo no presente"',
            microphoneToggle: 'Mantener el micrófono activa en "modo no presente"',
        },
        save: "Guardar",
        fullscreen: "Pantalla completa",
        notifications: "Notificaciones",
        cowebsiteTrigger: "Preguntar siempre antes de abrir sitios web y habitaciones Jitsi Meet",
        ignoreFollowRequest: "Ignorar peticiones de seguir a otros usuarios",
    },
    invite: {
        description: "¡Compartir el enlace de la habitación!",
        copy: "Copiar",
        share: "Compartir",
        walkAutomaticallyToPosition: "Caminar automáticamente hacia mi posición",
        selectEntryPoint: "Seleccione un punto de entrada",
    },
    globalMessage: {
        text: "Texto",
        audio: "Audio",
        warning: "Transmitir a todas las habitaciones del mundo",
        enter: "Introduzca su mensaje aquí...",
        send: "Enviar",
    },
    globalAudio: {
        uploadInfo: "Suba un archivo",
        error: "Ningún archivo seleccionado. Tiene que subir un archivo antes de enviarlo.",
        errorUpload:
            "Error al cargar el archivo. Por favor revise su archivo y vuelva a intentarlo. Si el problema persiste, póngase en contacto con el administrador.",
    },
    contact: {
        gettingStarted: {
            title: "Empezar",
            description:
                "WorkAdventure le permite crear un espacio en línea para comunicarse espontáneamente con otros. Y todo empieza creando su propio espacio. Escoja de una gran selección de mapas prefabricados por nuestro equipo.",
        },
        createMap: {
            title: "Crear su mapa",
            description: "También puede crear su propio mapa personalizado siguiendo los pasos de la documentación.",
        },
    },
    about: {
        mapInfo: "Información en el mapa",
        mapLink: "enlace a este mapa",
        copyrights: {
            map: {
                title: "Derechos de autor del mapa",
                empty: "El creador del mapa no ha declarado derechos de autor del mapa.",
            },
            tileset: {
                title: "Derechos de autor de las fichas",
                empty: "El creador del mapa no ha declarado derechos de autor de las fichas. Esto no significa que esas fichas no tengan licencia.",
            },
            audio: {
                title: "Derechos de autor de los archivos de audio",
                empty: "El creador del mapa no ha declarado derechos de autor de los archivos de audio. Esto no significa que esos archivos de audio no tengan licencia.",
            },
        },
    },
    sub: {
        profile: "Perfil",
        settings: "Ajustes",
        invite: "Invitar",
        credit: "Créditos",
        globalMessages: "Mensajes Globales",
        contact: "Contacto",
        report: "Report Issues",
    },
};

export default menu;
