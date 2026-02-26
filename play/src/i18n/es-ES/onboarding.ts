import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "¡Bienvenido a {worldName}! 🚀",
        description:
            "Prepárate para explorar un mundo virtual donde puedes moverte, chatear con otros y colaborar en tiempo real. ¡Hagamos un recorrido rápido para ayudarte a comenzar!",
        start: "¡Vamos!",
        skip: "Saltar tutorial",
    },
    movement: {
        title: "Moverse",
        descriptionDesktop:
            "Usa las teclas de flecha o WASD para mover tu personaje. También puedes hacer clic derecho para moverte. ¡Prueba a moverte ahora!",
        descriptionMobile: "Usa el joystick o toca el mapa para mover tu personaje. ¡Prueba a moverte ahora!",
        next: "Siguiente",
    },
    communication: {
        title: "Burbujas de comunicación",
        description:
            "Cuando te acerques a otros jugadores, entrarás automáticamente en una burbuja de comunicación. ¡Puedes chatear con otros en la misma burbuja!",
        video: "./static/Videos/Meet.mp4",
        next: "¡Entendido!",
    },
    lockBubble: {
        title: "Bloquear tu conversación",
        description:
            "Haz clic en el botón de bloqueo para evitar que otros se unan a tu burbuja de conversación. ¡Es útil para discusiones privadas!",
        video: "./static/Videos/LockBubble.mp4",
        hint: "¡Haz clic en el botón de bloqueo resaltado para probarlo!",
        next: "Siguiente",
    },
    screenSharing: {
        title: "Compartir tu pantalla",
        description:
            "Comparte tu pantalla con otros en tu burbuja de conversación. ¡Perfecto para presentaciones y colaboración!",
        video: "./static/images/screensharing.mp4",
        hint: "¡Haz clic en el botón de compartir pantalla resaltado para comenzar a compartir!",
        next: "Siguiente",
    },
    pictureInPicture: {
        title: "Imagen en imagen",
        description:
            "Usa el modo Imagen en imagen para mantener las videollamadas visibles mientras navegas por el mapa. ¡Genial para multitarea!",
        video: "./static/Videos/PictureInPicture.mp4",
        hint: "¡Haz clic en el botón PiP resaltado para activarlo!",
        next: "Siguiente",
    },
    complete: {
        title: "¡Ya estás listo! 🎉",
        description:
            "¡Has aprendido los conceptos básicos de {worldName}! Siéntete libre de explorar, conocer nuevas personas y divertirte. Siempre puedes acceder a la ayuda desde el menú si la necesitas.",
        finish: "¡Comienza a explorar!",
    },
} satisfies Translation["onboarding"];
