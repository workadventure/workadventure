import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    announcement: {
        title: "Enviar un anunci",
        audience: "Qui el rep?",
        thisRoom: "Aquesta sala",
        wholeWorld: "Tot el món",
        place: "Lloc on anar (opcional)",
        noPlace: "Cap lloc",
        noPlaceOnMap: "Aquest mapa encara no té cap zona amb nom.",
        preview: "Previsualització",
        sendToRoom: "Enviar a aquesta sala",
        sendToWorld: "Enviar a tot el món",
        confirmWorld: "Totes les sales del món el rebran.",
        confirmSend: "Sí, enviar a tot el món",
        cancel: "Cancel·lar",
        sentToRoom: "Anunci enviat a aquesta sala",
        sentToWorld: "Anunci enviat a tot el món",
        join: "Anar a {place}",
        joinMap: "Anar-hi",
        placeNotFound: "Aquest lloc ja no existeix al mapa.",
        admin: "Administrador",
        more: "Anuncis en espera: {count}",
    },
    modal: {
        liveMessage: {
            startMegaphone: "Iniciar megàfon",
            stopMegaphone: "Aturar megàfon",
            goingToStream: "Vas a transmetre",
            yourMicrophone: "el teu micròfon",
            yourCamera: "la teva càmera",
            yourScreen: "la teva pantalla",
            title: "Megàfon",
            and: "i",
            toAll: "a tots els participants",
            settings: "Configuració",
        },
    },
};

export default megaphone;
