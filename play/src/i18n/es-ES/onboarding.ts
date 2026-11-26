import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "¡Bienvenido a {worldName}! 🚀",
        description:
            "Prepárate para explorar un mundo virtual donde puedes moverte, chatear con otros y colaborar en tiempo real. ¡Hagamos un recorrido rápido para ayudarte a comenzar!",
    },
    movement: {
        title: "Moverse",
        descriptionDesktop:
            "Usa las teclas de flecha o WASD para mover tu personaje. También puedes hacer clic derecho para moverte. ¡Prueba a moverte ahora!",
        descriptionTouch: "Toca el mapa para ir allí y arrastra para mirar a tu alrededor. ¡Prueba a moverte ahora!",
        next: "Siguiente",
    },
    communication: {
        title: "Burbujas de comunicación",
        description:
            "Cuando te acerques a otros jugadores, entrarás automáticamente en una burbuja de comunicación. ¡Puedes chatear con otros en la misma burbuja!",
    },
    lockBubble: {
        title: "Bloquear tu conversación",
        description:
            "Haz clic en el botón de bloqueo para evitar que otros se unan a tu burbuja de conversación. ¡Es útil para discusiones privadas!",
    },
    screenSharing: {
        title: "Compartir tu pantalla",
        description:
            "Comparte tu pantalla con otros en tu burbuja de conversación. ¡Perfecto para presentaciones y colaboración!",
    },
    pictureInPicture: {
        title: "Imagen en imagen",
        description:
            "Usa el modo Imagen en imagen para mantener las videollamadas visibles mientras navegas por el mapa. ¡Genial para multitarea!",
    },
    complete: {
        title: "¡Ya estás listo! 🎉",
        description:
            "¡Has aprendido los conceptos básicos de {worldName}! Siéntete libre de explorar, conocer nuevas personas y divertirte. Siempre puedes acceder a la ayuda desde el menú si la necesitas.",
    },
    tips: {
        label: "Consejo",
        next: "Siguiente",
        previous: "Anterior",
        gotIt: "Entendido",
        close: "Cerrar",
        stopShowing: "No mostrar más consejos",
        restartTutorial: "Reiniciar el tutorial",
        showMe: "Muéstrame",
        notNow: "Ahora no",
    },
    help: {
        inConversation: "Durante una conversación",
        inMapEditor: "En el editor de mapas",
        notHere: "No disponible aquí ahora mismo",
        remindMe: "Recuérdamelo",
        showTips: "Mostrar consejos automáticamente",
    },
    releaseNotes: {
        title: "Novedades de WorkAdventure {version}",
    },
    mapEditorTour: {
        title: "Coloca muebles con el editor de mapas",
        openMenu: {
            title: "Haz tuyo este lugar",
            text: "Puedes modificar este mapa. Abre el menú **{menu}** para empezar.",
        },
        openEditor: "Haz clic en **{editor}**.",
        placeObject: {
            title: "Coloca muebles",
            text: "Elige un objeto de esta lista y haz clic en el mapa para colocarlo.",
        },
    },
} satisfies Translation["onboarding"];
