import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    enable: {
        title: "Encender la cámara y el micrófono",
        start: "¡Allá vamos!",
    },
    help: {
        title: "Se necesita acceso a la cámara/micrófono",
        permissionDenied: "Permiso denegado",
        content: "Debe permitir acceso a la cámara y el micrófono en el navegador.",
        firefoxContent:
            'Por favor, haga clic en la caja "Recordar esta decisión", si no quiere que Firefox siga pidiéndole autorización.',
        refresh: "Refrescar",
        continue: "Continuar sin cámara",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
    },
    my: {
        silentZone: "Zona silenciosa",
        nameTag: "Usted",
    },
    disable: "Apaga tu cámara",
};

export default camera;
