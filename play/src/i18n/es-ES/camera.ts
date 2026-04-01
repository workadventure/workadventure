import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    editCam: "Editar cámara",
    editMic: "Editar micrófono",
    editSpeaker: "Editar salida de audio",
    active: "Activo",
    disabled: "Desactivado",
    notRecommended: "No recomendado",
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
        allow: "Permitir webcam",
        continue: "Continuar sin cámara",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
        tooltip: {
            permissionDeniedTitle: "Acceso a la cámara bloqueado",
            permissionDeniedDesc:
                "El navegador ha denegado el acceso a la cámara para este sitio. Permítelo desde la barra de direcciones (candado o icono de cámara) o en la configuración del sitio. La ilustración corresponde a tu navegador.",
            noDeviceTitle: "Ninguna cámara utilizable",
            noDeviceDesc:
                "El navegador no detecta ninguna cámara utilizable. Prueba otro navegador, comprueba que la cámara esté conectada o reinicia el equipo si el dispositivo debería funcionar.",
            permissionMedia: {
                firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
                chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
                safari: "/resources/help-setting-camera-permission/en-US-firefox.png",
                android: "/resources/help-setting-camera-permission/en-US-firefox.png",
                default: "/resources/help-setting-camera-permission/en-US-firefox.png",
            },
        },
        microphoneTooltip: {
            permissionDeniedTitle: "Acceso al micrófono bloqueado",
            permissionDeniedDesc:
                "El navegador ha denegado el acceso al micrófono para este sitio. Permítelo desde la barra de direcciones (candado o icono del micrófono) o en la configuración del sitio. La ilustración corresponde a tu navegador.",
            noDeviceTitle: "Ningún micrófono utilizable",
            noDeviceDesc:
                "El navegador no detecta ningún micrófono utilizable. Prueba otro navegador, comprueba el micrófono o reinicia el equipo si el dispositivo debería funcionar.",
            permissionMedia: {
                firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
                chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
                safari: "/resources/help-setting-camera-permission/en-US-firefox.png",
                android: "/resources/help-setting-camera-permission/en-US-firefox.png",
                default: "/resources/help-setting-camera-permission/en-US-firefox.png",
            },
        },
    },
    webrtc: {
        title: "Error de conexión del servidor de retransmisión de vídeo",
        titlePending: "Conexión del servidor de retransmisión de vídeo pendiente",
        error: "El servidor TURN no es accesible",
        content:
            "No se puede acceder al servidor de retransmisión de vídeo. Es posible que no puedas comunicarte con otros usuarios.",
        solutionVpn:
            "Si te estás <strong>conectando mediante una VPN</strong>, desconéctate de tu VPN y actualiza la página web.",
        solutionVpnNotAskAgain: "Entendido. No me vuelvas a avisar 🫡",
        solutionHotspot:
            "Si estás en una red restringida (red de empresa...), intenta cambiar de red. Por ejemplo, crea un <strong>punto de acceso Wifi</strong> con tu teléfono y conéctate mediante tu teléfono.",
        solutionNetworkAdmin: "Si eres un <strong>administrador de red</strong>, revisa la ",
        preparingYouNetworkGuide: 'guía "Preparar tu red"',
        refresh: "Actualizar",
        continue: "Continuar",
        newDeviceDetected: "Nuevo dispositivo detectado {device} 🎉 ¿Cambiar? [ESPACIO] Ignorar [ESC]",
    },
    my: {
        silentZone: "Zona silenciosa",
        silentZoneDesc:
            "Estás en una zona silenciosa. Solo puedes ver y oír a las personas con las que estás. No puedes ver ni oír a las otras personas en la sala.",
        nameTag: "Tú",
        loading: "Cargando tu cámara...",
    },
    disable: "Apaga tu cámara",
    menu: {
        moreAction: "Más acciones",
        closeMenu: "Cerrar el menú",
        senPrivateMessage: "Enviar un mensaje privado (próximamente)",
        kickoffUser: "Expulsar usuario",
        muteAudioUser: "Silenciar audio",
        askToMuteAudioUser: "Pedir silenciar audio",
        muteAudioEveryBody: "Silenciar audio para todos",
        muteVideoUser: "Silenciar vídeo",
        askToMuteVideoUser: "Pedir silenciar vídeo",
        muteVideoEveryBody: "Silenciar vídeo para todos",
        blockOrReportUser: "Bloquear o informar de usuario",
    },
    backgroundEffects: {
        imageTitle: "Imágenes de fondo",
        videoTitle: "Vídeos de fondo",
        blurTitle: "Desenfoque de fondo",
        resetTitle: "Desactivar efectos de fondo",
        title: "Efectos de fondo",
        close: "Cerrar",
        blurAmount: "Cantidad de desenfoque",
    },
};

export default camera;
