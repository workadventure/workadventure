import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    enable: {
        title: "Encendre la càmera i el micròfon",
        start: "Som-hi!",
    },
    help: {
        title: "Es necessita accéss a la càmera/micròfon",
        permissionDenied: "Permís denegat",
        content: "Ha de permetre accés a la càmera i el micròfon al navegador.",
        firefoxContent:
            'Si us plau, feu clic a la caixa "Recordar aquesta decisió", si no voleu que Firefox sigui demanant autorització.',
        refresh: "Refrescar",
        continue: "Continuar sense càmera",
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
        nameTag: "Usted",
    },
    disable: "Apagueu la càmera",
};

export default camera;
