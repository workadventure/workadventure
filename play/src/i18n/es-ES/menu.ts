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
            todoList: "Abrir la lista de tareas",
        },
    },
    visitCard: {
        close: "Cerrar",
        sendMessage: "Enviar mensaje",
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
            high: "High",
        },
        shareScreenBandwidth: {
            title: "Calidad de compartir pantalla",
            low: "Baja",
            recommended: "Recomendada",
            high: "High",
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
        otherSettings: "Todas las configuraciones",
        fullscreen: "Pantalla completa",
        notifications: "Notificaciones",
        enablePictureInPicture: "Activar picture-in-picture",
        chatSounds: "Sonidos del chat",
        cowebsiteTrigger: "Preguntar siempre antes de abrir sitios web y habitaciones Jitsi Meet",
        ignoreFollowRequest: "Ignorar peticiones de seguir a otros usuarios",
        proximityDiscussionVolume: "Volumen de las burbujas de discusión",
        blockAudio: "Bloquear sonidos ambientales y música",
        disableAnimations: "Desactivar las animaciones del mapa",
        bubbleSound: "Sonido de las burbujas",
        bubbleSoundOptions: {
            ding: "Ding",
            wobble: "Wobble",
        },
        displayVideoQualityStats: "Mostrar estadísticas de calidad de vídeo",
    },
    invite: {
        description: "¡Compartir el enlace de la habitación!",
        copy: "Copiar",
        copied: "Copiado",
        share: "Compartir",
        walkAutomaticallyToPosition: "Caminar automáticamente hacia mi posición",
        selectEntryPoint: "Usar un punto de entrada diferente",
        selectEntryPointSelect: "Seleccione el punto de entrada por el que llegarán los usuarios",
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
        dragAndDrop: "Arrastrar y soltar o hacer clic aquí para subir su archivo 🎧",
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
    chat: {
        matrixIDLabel: "Su ID Matrix",
        settings: "Ajustes",
        resetKeyStorageUpButtonLabel: "Restablecer el almacenamiento de claves",
        resetKeyStorageConfirmationModal: {
            title: "Confirmación de restablecimiento del almacenamiento de claves",
            content: "Está a punto de restablecer el almacenamiento de claves. ¿Está seguro?",
            warning:
                "Restablecer el almacenamiento de claves eliminará su sesión actual y todos los usuarios de confianza. Podría perder el acceso a algunos mensajes pasados y ya no será reconocido como usuario de confianza. Asegúrese de entender completamente las consecuencias de esta acción antes de continuar.",
            cancel: "Cancelar",
            continue: "Continuar",
        },
    },
    sub: {
        profile: "Perfil",
        settings: "Ajustes",
        invite: "Invitar",
        credit: "Créditos",
        globalMessages: "Mensajes Globales",
        contact: "Contacto",
        report: "Reportar problemas",
        chat: "Chat",
        help: "Ayuda y tutoriales",
        contextualActions: "Acciones contextuales",
        shortcuts: "Atajos",
    },
    shortcuts: {
        title: "Atajos de teclado",
        keys: "Atajo",
        actions: "Acción",
        moveUp: "Mover arriba",
        moveDown: "Mover abajo",
        moveLeft: "Mover a la izquierda",
        moveRight: "Mover a la derecha",
        speedUp: "Correr",
        interact: "Interactuar",
        follow: "Seguir",
        openChat: "Abrir el chat",
        openUserList: "Abrir la lista de usuarios",
        toggleMapEditor: "Mostrar/Ocultar el editor de mapas",
        rotatePlayer: "Rotar el jugador",
        emote1: "Emoticona 1",
        emote2: "Emoticona 2",
        emote3: "Emoticona 3",
        emote4: "Emoticona 4",
        emote5: "Emoticona 5",
        emote6: "Emoticona 6",
        openSayPopup: "Abrir la ventana emergente en modo decir",
        openThinkPopup: "Abrir la ventana emergente en modo pensar",
        walkMyDesk: "Caminar hasta mi escritorio",
    },
};

export default menu;
