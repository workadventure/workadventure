import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    enable: {
        title: "Ligue sua câmera e microfone",
        start: "Vamos lá!",
    },
    help: {
        title: "Necessário acesso à câmera/microfone",
        permissionDenied: "Permissão negada",
        content: "Você deve permitir o acesso à câmera e ao microfone em seu navegador.",
        firefoxContent:
            'Por favor, clique na caixa de seleção "Lembrar esta decisão", se você não quiser que o Firefox continue pedindo a autorização.',
        refresh: "Atualizar",
        continue: "Continuar sem webcam",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
    },
    webrtc: {
        title: "WebRtc connection error",
        error: "STUN / TURN server isn't reachable",
        content:
            "The video relay server cannot be reached. You may be unable to communicate with other users. If you are connecting via a VPN, please disconnect and refresh the web page. You may click on the link below to test your WebRtc connection.",
        testUrl: "WebRtc connection test",
        refresh: "Refresh",
        continue: "Continue",
    },
    my: {
        silentZone: "Zona silenciosa",
        nameTag: "Você",
    },
    disable: "Desligue sua câmera",
};

export default camera;
