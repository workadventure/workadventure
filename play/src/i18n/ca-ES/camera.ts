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
        continue: "Continuar sense càmera",
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
    disable: "Apagueu la càmera",
    menu: {
        moreAction: "Més accions",
        closeMenu: "Tancar el menú",
        senPrivateMessage: "Enviar un missatge privat (pròximament)",
        kickoffUser: "Expulsar usuari",
        muteAudioUser: "Silenciar audio",
        muteAudioEveryBody: "Silenciar audio per a tothom",
        muteVideoUser: "Silenciar vídeo",
        muteVideoEveryBody: "Silenciar vídeo per a tothom",
        pin: "Fixar",
        blockOrReportUser: "Bloquejar o informar d'usuari",
    },
};

export default camera;
