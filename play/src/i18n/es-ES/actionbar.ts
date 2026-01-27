import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    understand: "¡Entendido!",
    edit: "Editar",
    cancel: "Cancelar",
    close: "Cerrar",
    login: "Iniciar sesión",
    map: "Herramientas",
    profil: "Editar tu nombre",
    startScreenSharing: "Iniciar compartir pantalla",
    stopScreenSharing: "Detener compartir pantalla",
    screenSharingMode: "Modo compartir pantalla",
    calendar: "Calendario",
    todoList: "Lista de tareas",
    woka: "Personalizar tu avatar",
    companion: "Añadir compañero",
    test: "Probar mi configuración",
    editCamMic: "Editar cámara / micrófono",
    allSettings: "Todas las configuraciones",
    globalMessage: "Enviar mensaje global",
    mapEditor: "Editor de mapa",
    mapEditorMobileLocked: "El editor de mapa está bloqueado en modo móvil",
    mapEditorLocked: "El editor de mapa está bloqueado 🔐",
    app: "Aplicaciones de terceros",
    camera: {
        disabled: "Tu cámara está desactivada",
        activate: "Activar tu cámara",
        noDevices: "No se encontró ningún dispositivo de cámara",
        setBackground: "Establecer fondo",
        blurEffects: "Efectos de desenfoque",
        disableBackgroundEffects: "Desactivar efectos de fondo",
        close: "Cerrar",
    },
    microphone: {
        disabled: "Tu micrófono está desactivado",
        activate: "Activar tu micrófono",
        noDevices: "No se encontró ningún dispositivo de micrófono",
    },
    speaker: {
        disabled: "Tu altavoz está desactivado",
        activate: "Activar tu altavoz",
        noDevices: "No se encontró ningún dispositivo de altavoz",
    },
    status: {
        ONLINE: "En línea",
        AWAY: "Ausente",
        BACK_IN_A_MOMENT: "Vuelvo en un momento",
        DO_NOT_DISTURB: "No molestar",
        BUSY: "Ocupado",
        OFFLINE: "Desconectado",
        SILENT: "Silencioso",
        JITSI: "En una reunión",
        BBB: "En una reunión",
        DENY_PROXIMITY_MEETING: "No disponible",
        SPEAKER: "En una reunión",
        LIVEKIT: "En una reunión",
        LISTENER: "En una reunión",
    },
    subtitle: {
        camera: "Cámara",
        microphone: "Micrófono",
        speaker: "Salida de audio",
    },
    background: {
        settings: "Configuración",
        cameraBackground: "Fondo de cámara",
        noEffect: "Sin efecto",
        blur: "Desenfoque",
        blurSmall: "Desenfoque pequeño",
        blurMiddle: "Desenfoque medio",
        blurHigh: "Desenfoque alto",
        images: "Imágenes",
        videos: "Vídeos",
    },
    help: {
        chat: {
            title: "Enviar mensaje de texto",
            desc: "Comparte tus ideas o inicia una discusión, directamente por escrito. Simple, claro, efectivo.",
        },
        users: {
            title: "Mostrar lista de usuarios",
            desc: "¡Ve quién está ahí, accede a su tarjeta de visita, envíales un mensaje o acércate a ellos con un clic!",
        },
        emoji: {
            title: "Mostrar un emoji",
            desc: "Expresa cómo te sientes con un solo clic usando reacciones emoji. ¡Solo toca y listo!",
        },
        audioManager: {
            title: "Volumen de sonidos ambientales",
            desc: "Configura el volumen de audio haciendo clic aquí.",
            pause: "Haga clic aquí para pausar el audio",
            play: "Haga clic aquí para reproducir el audio",
            stop: "Haga clic aquí para detener el audio",
        },
        audioManagerNotAllowed: {
            title: "Sonidos ambientales bloqueados",
            desc: "Su navegador ha impedido la reproducción de sonidos ambientales. Haga clic en el icono para iniciar la reproducción.",
        },
        follow: {
            title: "Pedir que te sigan",
            desc: "Puedes pedirle a un usuario que te siga, y si esta solicitud es aceptada, su Woka te seguirá automáticamente, estableciendo así una conexión fluida.",
        },
        unfollow: {
            title: "Dejar de seguir",
            desc: "Puedes elegir dejar de seguir a un usuario en cualquier momento. Tu Woka dejará de seguirlos, devolviéndote tu libertad de movimiento.",
        },
        lock: {
            title: "Bloquear conversación",
            desc: "Al habilitar esta función, te aseguras de que nadie pueda unirse a la discusión. Eres el dueño de tu espacio, y solo los que ya están presentes pueden interactuar.",
        },
        megaphone: {
            title: "Detener megáfono",
            desc: "Deja de transmitir tu mensaje a todos los usuarios.",
        },
        mic: {
            title: "Activar/desactivar tu micrófono",
            desc: "Activa o corta tu micrófono para que otros te escuchen durante la discusión.",
        },
        micDisabledByStatus: {
            title: "Micrófono desactivado",
            desc: 'Tu micrófono está desactivado porque estás en estado "{status}".',
        },
        cam: {
            title: "Activar/desactivar tu cámara",
            desc: "Activa o corta tu cámara para mostrar tu video a los otros participantes.",
        },
        camDisabledByStatus: {
            title: "Cámara desactivada",
            desc: 'Tu cámara está desactivada porque estás en estado "{status}".',
        },
        share: {
            title: "Compartir tu pantalla",
            desc: "¿Quieres compartir tu pantalla con otros usuarios? ¡Puedes! Puedes mostrar tu pantalla a todos en el chat, y puedes elegir compartir toda tu pantalla o solo una ventana específica.",
        },
        apps: {
            title: "Aplicaciones de terceros",
            desc: "Tienes la libertad de navegar por aplicaciones externas mientras permaneces en nuestra aplicación, para una experiencia fluida y enriquecida.",
        },
        roomList: {
            title: "Lista de salas",
            desc: "Explora la lista de salas para ver quién está presente y unirte a una conversación con un clic.",
        },
        calendar: {
            title: "Calendario",
            desc: "Consulta tus reuniones próximas y únete a ellas directamente desde WorkAdventure.",
        },
        todolist: {
            title: "Lista de tareas",
            desc: "Gestiona tus tareas del día sin salir de tu espacio de trabajo.",
        },
        pictureInPicture: {
            title: "Imagen en imagen",
            descDisabled:
                "Desafortunadamente, esta función no está disponible en tu dispositivo ❌. Por favor, intenta usar otro dispositivo o navegador, como Chrome o Edge, para acceder a esta función.",
            desc: "Puedes usar la función de imagen en imagen para ver un video o una presentación mientras estás en una conversación. Simplemente haz clic en el icono de imagen en imagen y disfruta de tu contenido.",
        },
    },
    listStatusTitle: {
        enable: "Cambiar tu estado",
    },
    externalModule: {
        status: {
            onLine: "El estado está bien ✅",
            offLine: "El estado está offline ❌",
            warning: "El estado está en advertencia ⚠️",
            sync: "El estado está sincronizando 🔄",
        },
    },
    featureNotAvailable: "Función no disponible para tu sala 😭",
    issueReport: {
        menuAction: "Reportar un problema",
        formTitle: "Reportar un problema",
        emailLabel: "Email (no requerido)",
        nameLabel: "Nombre (no requerido)",
        descriptionLabel: "Descripción* (requerida)",
        descriptionPlaceholder: "¿Cuál es el problema? ¿Qué esperabas?",
        submitButtonLabel: "Enviar reporte de error",
        cancelButtonLabel: "Cancelar",
        confirmButtonLabel: "Confirmar",
        addScreenshotButtonLabel: "Añadir una captura de pantalla",
        removeScreenshotButtonLabel: "Eliminar captura de pantalla",
        successMessageText: "¡Gracias por tu reporte! Lo revisaremos lo antes posible.",
        highlightToolText: "Resaltar",
        hideToolText: "Ocultar",
        removeHighlightText: "Eliminar",
    },
    personalDesk: {
        label: "Ir a mi escritorio",
        unclaim: "Liberar mi escritorio",
        errorNoUser: "No se pueden encontrar sus datos de usuario",
        errorNotFound: "Aún no tiene un escritorio personal",
        errorMoving: "No se puede llegar a su escritorio personal",
        errorUnclaiming: "No se puede liberar su escritorio personal",
    },
};

export default actionbar;
