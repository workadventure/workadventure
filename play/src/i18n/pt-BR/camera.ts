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
        nameTag: "Você",
    },
    disable: "Desligue sua câmera",
};

export default camera;
