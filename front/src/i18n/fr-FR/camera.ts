import type { Translation } from "../i18n-types";

const camera: NonNullable<Translation["camera"]> = {
    enable: {
        title: "Allumez votre caméra et votre microphone",
        start: "C'est parti!",
    },
    help: {
        title: "Accès à la caméra / au microphone nécessaire",
        permissionDenied: "Permission refusée",
        content: "Vous devez autoriser l'accès à la caméra et au microphone dans votre navigateur.",
        firefoxContent:
            'Veuillez cocher la case "Se souvenir de cette décision" si vous ne voulez pas que Firefox vous demande sans cesse l\'autorisation.',
        refresh: "Rafraîchir",
        continue: "Continuer sans webcam",
    },
    my: {
        silentZone: "Zone silencieuse",
    },
};

export default camera;
