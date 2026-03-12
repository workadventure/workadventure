import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        backToSelectCommunication: "Tornar a seleccionar comunicació",
        selectCommunication: "Seleccionar comunicació",
        title: "Comunicació global",
        selectCamera: "Selecciona una càmera 📹",
        selectMicrophone: "Selecciona un micròfon 🎙️",
        liveMessage: {
            startMegaphone: "Iniciar megàfon",
            stopMegaphone: "Aturar megàfon",
            goingToStream: "Vas a transmetre",
            yourMicrophone: "el teu micròfon",
            yourCamera: "la teva càmera",
            yourScreen: "la teva pantalla",
            title: "Megàfon",
            button: "Iniciar missatge en directe",
            and: "i",
            toAll: "a tots els participants",
            confirm: "Confirmar",
            cancel: "Cancel·lar",
            notice: `
            El missatge en directe o "Megàfon" et permet enviar un missatge en directe amb la teva càmera i micròfon a totes les persones connectades a la sala o el món.

            Aquest missatge es mostrarà a la cantonada inferior de la pantalla, com una videotrucada o una bombolla de discussió.

            Un exemple d'ús del missatge en directe: "Hola a tothom, comencem la conferència? 🎉 Segueix el meu avatar fins a l'àrea de conferència i obre l'aplicació de vídeo 🚀"
            `,
            settings: "Configuració",
        },
        textMessage: {
            title: "Missatge de text",
            notice: `
            El missatge de text et permet enviar un missatge a totes les persones connectades a la sala o el món.

            Aquest missatge es mostrarà com una finestra emergent a la part superior de la pàgina i anirà acompanyat d'un so per identificar que la informació és llegible.

            Un exemple de missatge: "La conferència a la sala 3 comença en 2 minuts 🎉. Pots anar a l'àrea de conferència 3 i obrir l'aplicació de vídeo 🚀"
            `,
            button: "Enviar un missatge de text",
            noAccess: "No tens accés a aquesta funció 😱 Si us plau, contacta amb l'administrador 🙏",
        },
        audioMessage: {
            title: "Missatge d'àudio",
            notice: `
            El missatge d'àudio és un missatge de tipus "MP3, OGG..." enviat a tots els usuaris connectats a la sala o al món.

            Aquest missatge d'àudio es descarregarà i es reproduirà per a totes les persones que rebin aquesta notificació.

            Un missatge d'àudio pot consistir en una gravació d'àudio que indica que una conferència començarà en uns minuts.
            `,
            button: "Enviar un missatge d'àudio",
            noAccess: "No tens accés a aquesta funció 😱 Si us plau, contacta amb l'administrador 🙏",
        },
    },
};

export default megaphone;
