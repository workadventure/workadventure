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
        silentZone: "ćichi wobłuk",
        nameTag: "Wy",
    },
    disable: "hasńće swoju kameru",
};

export default camera;
