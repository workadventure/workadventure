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
        continue: "bjez kamery pokročować",
        screen: {
            firefox: "/resources/help-setting-camera-permission/de-DE-chrome.png",
            chrome: "/resources/help-setting-camera-permission/de-DE-chrome.png",
        },
    },
    webrtc: {
        title: "serwer widejo-relej njewotmołwja – zmylk",
        titlePending: "zwjaza so ze serwerom widejo-relej",
        error: "serwer TURN njedocpěju",
        content: "Zwisk k serwerej widejo-relej njeje móžny. Tuž druhich wužiwarjow ewtl. njedocpěješ.",
        solutionVpn: "Zwjazaš-li so přez VPN, přetorhń dotalny zwisk ze swojim VPN a aktualizuj web-stronu.",
        solutionHotspot:
            "Sy-li w někajkej wobmjezowanej/internej syći, spytaj to w druhej syći. Wutwor na př. ze swojim telefonom WLAN-hotspot a zwjazaj so přez njón.",
        solutionNetworkAdmin: "Sy-li administrator syće, pruwuj ",
        preparingYouNetworkGuide: 'nawod "Preparing your network"',
        refresh: "aktualizuj",
        continue: "dale",
    },
    my: {
        silentZone: "ćichi wobłuk",
        nameTag: "Wy",
    },
    disable: "hasńće swoju kameru",
    menu: {
        moreAction: "dalše akcije",
        closeMenu: "meny začinić",
        senPrivateMessage: "pśewatne powěsće posłaś (pśichadźe)",
        kickoffUser: "wužiwarja wotmětować",
        muteAudioUser: "audio stummschalten",
        muteAudioEveryBody: "audio za wšěch stummschalten",
        muteVideoUser: "video stummschalten",
        muteVideoEveryBody: "video za wšěch stummschalten",
        pin: "pśipinaś",
        blockOrReportUser: "wužiwarja blokować abo pśihłasować",
    },
};

export default camera;
