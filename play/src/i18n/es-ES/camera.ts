import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    enable: {
        title: "Encender la cámara y el micrófono",
        start: "¡Bienvenido a nuestra página de configuración de dispositivos de audio y video! Encuentra aquí las herramientas para mejorar tu experiencia en línea. Ajusta la configuración según tus preferencias para resolver cualquier problema potencial. Asegúrate de que tu hardware esté correctamente conectado y actualizado. Explora y prueba diferentes configuraciones para encontrar la que mejor se adapte a ti.",
    },
    help: {
        title: "Se necesita acceso a la cámara/micrófono",
        permissionDenied: "Permiso denegado",
        content: "Debe permitir acceso a la cámara y el micrófono en el navegador.",
        firefoxContent:
            'Por favor, haga clic en la caja "Recordar esta decisión", si no quiere que Firefox siga pidiéndole autorización.',
        continue: "Continuar sin cámara",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
    },
    /*webrtc: {
        title: "TODO: Video relay server connection error",
        titlePending: "TODO: Video relay server connection pending",
        error: "TODO: TURN server isn't reachable",
        content: "TODO: The video relay server cannot be reached. You may be unable to communicate with other users.",
        solutionVpn: "TODO: If you are <strong>connecting via a VPN</strong>, please disconnect from you VPN and refresh the web page.",
        solutionHotspot: "TODO: If you are on a restricted network (company network...), try switching network. For instance, create a <strong>Wifi hotspot</strong> with your phone and connect via your phone.",
        solutionNetworkAdmin: "TODO: If you are a <strong>network administrator</strong>, review the ",
        preparingYouNetworkGuide: 'TODO: "Preparing your network" guide',
        refresh: "TODO: Refresh",
        continue: "TODO: Continue",
    },*/
    my: {
        silentZone: "Zona silenciosa",
        nameTag: "Usted",
    },
    disable: "Apaga tu cámara",
    menu: {
        moreAction: "Más acciones",
        closeMenu: "Cerrar el menú",
        senPrivateMessage: "Enviar un mensaje privado (próximamente)",
        kickoffUser: "Expulsar usuario",
        muteAudioUser: "Silenciar audio",
        muteAudioEveryBody: "Silenciar audio para todos",
        muteVideoUser: "Silenciar vídeo",
        muteVideoEveryBody: "Silenciar vídeo para todos",
        pin: "Fijar",
        blockOrReportUser: "Bloquear o informar de usuario",
    },
};

export default camera;
