import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    enable: {
        title: "Prošu zaswěć swoju kameru a swój mikrofon.",
        start: "Start!",
    },
    help: {
        title: "přistup ke kamerje/mikrofonje trěbny",
        permissionDenied: "přistup zapowědźeny",
        content: "Přistup na kameru a mikrofon dyrbi so w browseru dopušćić dać.",
        firefoxContent:
            'Prošu zaklik na "Diese Entscheidungen speichern" šaltowanskej přestrjeni, zo by so wospjetnym naprašowanjam za dowolnosću w Firefox zadźěwało.',
        refresh: "aktualizować",
        continue: "bjez kamery pokročować",
        screen: {
            firefox: "/resources/help-setting-camera-permission/de-DE-chrome.png",
            chrome: "/resources/help-setting-camera-permission/de-DE-chrome.png",
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
        silentZone: "ćichi wobłuk",
        nameTag: "Wy",
    },
    disable: "hasńće swoju kameru",
};

export default camera;
