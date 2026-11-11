import type { BaseTranslation } from "../i18n-types";

const megaphone: BaseTranslation = {
    announcement: {
        title: "Enviar um anúncio",
        audience: "Quem recebe?",
        thisRoom: "Esta sala",
        wholeWorld: "Mundo inteiro",
        place: "Lugar para ir (opcional)",
        noPlace: "Nenhum lugar",
        noPlaceOnMap: "Este mapa ainda não tem área com nome.",
        preview: "Pré-visualização",
        sendToRoom: "Enviar para esta sala",
        sendToWorld: "Enviar para o mundo inteiro",
        confirmWorld: "Todas as salas do mundo vão receber.",
        confirmSend: "Sim, enviar para o mundo inteiro",
        cancel: "Cancelar",
        sentToRoom: "Anúncio enviado para esta sala",
        sentToWorld: "Anúncio enviado para o mundo inteiro",
        join: "Ir para {place}",
        joinMap: "Ir",
        placeNotFound: "Este lugar não existe mais no mapa.",
        admin: "Administrador",
        more: "Anúncios em espera: {count}",
    },
    modal: {
        liveMessage: {
            microphoneOff: "Microfone desligado",
            cameraOff: "Câmera desligada",
            cameraOffHint: "Você pode entrar ao vivo só com o microfone.",
            devices: "Câmera e microfone",
            whoHears: "Quem ouve você?",
            thisRoom: "Esta sala",
            wholeWorld: "Todas as salas do mundo",
            live: "Ao vivo",
            stop: "Parar",
            title: "Mensagem ao vivo",
        },
    },
};

export default megaphone;
