import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        backToSelectCommunication: "Volver a seleccionar comunicación",
        selectCommunication: "Seleccionar comunicación",
        title: "Comunicación global",
        selectCamera: "Selecciona una cámara 📹",
        selectMicrophone: "Selecciona un micrófono 🎙️",
        liveMessage: {
            startMegaphone: "Iniciar megáfono",
            stopMegaphone: "Detener megáfono",
            goingToStream: "Vas a transmitir",
            yourMicrophone: "tu micrófono",
            yourCamera: "tu cámara",
            yourScreen: "tu pantalla",
            title: "Megáfono",
            button: "Iniciar mensaje en vivo",
            and: "y",
            toAll: "a todos los participantes",
            confirm: "Confirmar",
            cancel: "Cancelar",
            notice: `
            El mensaje en vivo o "Megáfono" te permite enviar un mensaje en vivo con tu cámara y micrófono a todas las personas conectadas en la sala o el mundo.

            Este mensaje se mostrará en la esquina inferior de la pantalla, como una videollamada o una burbuja de discusión.

            Un ejemplo de uso del mensaje en vivo: "Hola a todos, ¿empezamos la conferencia? 🎉 Sigue mi avatar hasta el área de conferencia y abre la aplicación de video 🚀"
            `,
            settings: "Configuración",
        },
        textMessage: {
            title: "Mensaje de texto",
            notice: `
            El mensaje de texto te permite enviar un mensaje a todas las personas conectadas en la sala o el mundo.

            Este mensaje se mostrará como una ventana emergente en la parte superior de la página y irá acompañado de un sonido para identificar que la información es legible.

            Un ejemplo de mensaje: "La conferencia en la sala 3 comienza en 2 minutos 🎉. Puedes ir al área de conferencia 3 y abrir la aplicación de video 🚀"
            `,
            button: "Enviar un mensaje de texto",
            noAccess: "No tienes acceso a esta función 😱 Por favor, contacta al administrador 🙏",
        },
        audioMessage: {
            title: "Mensaje de audio",
            notice: `
            El mensaje de audio es un mensaje de tipo "MP3, OGG..." enviado a todos los usuarios conectados en la sala o en el mundo.

            Este mensaje de audio se descargará y reproducirá para todas las personas que reciban esta notificación.

            Un mensaje de audio puede consistir en una grabación de audio que indica que una conferencia comenzará en unos minutos.
            `,
            button: "Enviar un mensaje de audio",
            noAccess: "No tienes acceso a esta función 😱 Por favor, contacta al administrador 🙏",
        },
    },
};

export default megaphone;
