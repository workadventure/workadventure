import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    editCam: "Kameru wobdźěłać",
    editMic: "Mikrofon wobdźěłać",
    editSpeaker: "Audiowyjadowanje wobdźěłać",
    active: "Aktiwny",
    disabled: "Deaktiwěrowany",
    notRecommended: "Njeporučeny",
    enable: {
        title: "Prošu zaswěć swoju kameru a swój mikrofon.",
        start: "Witajće na našej stronie za konfiguraciju awdio- a widejogratow! Namakajće tu nastroje, zo byšće swoju online-dožiwjenje polěpšili. Přiměrće nastajenja swojim preferencam, zo byšće eventuelne problemy rozrisali. Zawěsćće, zo waša hardware korektnje zwjazana a aktualizowana je. Wuslědźće a testujće wšelake konfiguracije, zo byšće namakali, što najlěpje za was funguje.",
    },
    help: {
        title: "přistup ke kamerje/mikrofonje trěbny",
        permissionDenied: "přistup zapowědźeny",
        content: "Přistup na kameru a mikrofon dyrbi so w browseru dopušćić dać.",
        firefoxContent:
            'Prošu zaklik na "Diese Entscheidungen speichern" šaltowanskej přestrjeni, zo by so wospjetnym naprašowanjam za dowolnosću w Firefox zadźěwało.',
        allow: "Webcam dowolić",
        continue: "bjez kamery pokročować",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/de-DE-chrome.png",
        },
        tooltip: {
            permissionDeniedTitle: "Kamerowy přistup je so zablokował",
            permissionDeniedDesc:
                "Waš wobhladowak je přistup ke kamerje za tutu stronu wotpokazał. Dopušćće jón přez adresowe polo (šlosk abo symbol kamery) abo w nastajenjach sydła. Wobraz wotpowěduje wašemu wobhladowakej.",
            noDeviceTitle: "Žana wužiwajomna kamera",
            noDeviceDesc:
                "Wobhladowak namaka žanu kameru, kotruž móžeće wužiwać. Spytajće druhi wobhladowak, překontrolujće zwjazanje kamery, přepruwujće konfiguraciju kompjutra (datowy škit, graty) abo startujće kompjuter znowa, jeli hardware měł fungować.",
            permissionMedia: {
                firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
                chrome: "/resources/help-setting-camera-permission/de-DE-chrome.png",
                safari: "/resources/help-setting-camera-permission/en-US-firefox.png",
                android: "/resources/help-setting-camera-permission/de-DE-chrome.png",
                default: "/resources/help-setting-camera-permission/en-US-firefox.png",
            },
        },
        microphoneTooltip: {
            permissionDeniedTitle: "Mikrofonowy přistup je so zablokował",
            permissionDeniedDesc:
                "Waš wobhladowak je přistup ke mikrofonej za tutu stronu wotpokazał. Dopušćće jón přez adresowe polo (šlosk abo symbol mikrofona) abo w nastajenjach sydła. Wobraz wotpowěduje wašemu wobhladowakej.",
            noDeviceTitle: "Žadyn wužiwajomny mikrofon",
            noDeviceDesc:
                "Wobhladowak namaka žadyn mikrofon, kotryž móžeće wužiwać. Spytajće druhi wobhladowak, překontrolujće mikrofon, přepruwujće konfiguraciju kompjutra (datowy škit, graty) abo startujće kompjuter znowa, jeli hardware měł fungować.",
            permissionMedia: {
                firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
                chrome: "/resources/help-setting-camera-permission/de-DE-chrome.png",
                safari: "/resources/help-setting-camera-permission/en-US-firefox.png",
                android: "/resources/help-setting-camera-permission/de-DE-chrome.png",
                default: "/resources/help-setting-camera-permission/en-US-firefox.png",
            },
        },
    },
    webrtc: {
        title: "serwer widejo-relej njewotmołwja – zmylk",
        titlePending: "zwjaza so ze serwerom widejo-relej",
        error: "serwer TURN njedocpěju",
        content: "Zwisk k serwerej widejo-relej njeje móžny. Tuž druhich wužiwarjow ewtl. njedocpěješ.",
        solutionVpn: "Zwjazaš-li so přez VPN, přetorhń dotalny zwisk ze swojim VPN a aktualizuj web-stronu.",
        solutionVpnNotAskAgain: "Rozumjeno. Mje zaso njewarnować 🫡",
        solutionHotspot:
            "Sy-li w někajkej wobmjezowanej/internej syći, spytaj to w druhej syći. Wutwor na př. ze swojim telefonom WLAN-hotspot a zwjazaj so přez njón.",
        solutionNetworkAdmin: "Sy-li administrator syće, pruwuj ",
        preparingYouNetworkGuide: 'nawod "Preparing your network"',
        refresh: "aktualizuj",
        continue: "dale",
        newDeviceDetected: "Nowy grat namakany {device} 🎉 Změnić? [SPACE] ignorować [ESC]",
    },
    my: {
        silentZone: "ćichi wobłuk",
        silentZoneDesc:
            "Sće w ćichim wobłuku. Móžeće jenož ludźi widźeć a słyšeć, z kotrymiž sće. Móžeće druhich ludźi w rumnje nje widźeć abo nje słyšeć.",
        nameTag: "Wy",
        loading: "Waša kamera so začituje...",
    },
    disable: "hasńće swoju kameru",
    menu: {
        moreAction: "dalše akcije",
        closeMenu: "meny začinić",
        senPrivateMessage: "pśewatne powěsće posłaś (pśichadźe)",
        kickoffUser: "wužiwarja wotmětować",
        muteAudioUser: "audio stummschalten",
        askToMuteAudioUser: "prosyć, zo by audio stummschalten",
        muteAudioEveryBody: "audio za wšěch stummschalten",
        muteVideoUser: "video stummschalten",
        askToMuteVideoUser: "prosyć, zo by video stummschalten",
        muteVideoEveryBody: "video za wšěch stummschalten",
        blockOrReportUser: "wužiwarja blokować abo pśihłasować",
    },
    backgroundEffects: {
        imageTitle: "Wobrazki pozadka",
        videoTitle: "Wideja pozadka",
        blurTitle: "Pozadk njewjasnosć",
        resetTitle: "Pozadk efekty deaktiwěrowaś",
        title: "Pozadk efekty",
        close: "Zacyniś",
        blurAmount: "Njewjasnosć měra",
    },
};

export default camera;
