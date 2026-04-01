import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    editCam: "Kameru wobźěłaś",
    editMic: "Mikrofon wobźěłaś",
    editSpeaker: "Audiowyjadowanje wobźěłaś",
    active: "Aktiwny",
    disabled: "Deaktiwěrowany",
    notRecommended: "Nje dopórucony",
    enable: {
        title: "Zašaltuj kameru a mikrofon.",
        start: "Witajśo na našej boku za konfiguraciju awdio- a widejogratow! Namakajśo how rědy, aby pólěpšyli swóju online-dožywjenje. Pśiměŕśo nastajenja swójim pśednosam, aby rozwězali eventuelne problemy. Zawěsććo, až waša hardware korektnje zwězana a aktualizěrowana jo. Wuslěźćo a testujśo wšake konfiguracije, aby namakali, což nejlěpje za was funkcioněrujo.",
    },
    help: {
        title: "Pśistup ku kamerje a mikrofonoju jo trjebny",
        permissionDenied: "Pśistup njejo zwólony",
        content: "Pśistup ku kamerje a mikrofonoju musy se zwóliś we browseru.",
        firefoxContent:
            'Klikni na bublin "Te nastajenja zachowaś", aby njemusali kuždy raz wótnowotki to zwólenje we Firefoxu aktiwěrowaś',
        allow: "Webcam zwóliś",
        continue: "Dalej mimo kamery",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/de-DE-chrome.png",
        },
        tooltip: {
            permissionDeniedTitle: "Kamerowy pśistup jo se blokěrował",
            permissionDeniedDesc:
                "Waš browser jo pśistup kamerje za toś ten bok wótpokazał. Zwóliśo jen pśez adresowe pólo (šlosk abo symbol kamery) abo w nastajenjach sedła. Wobraz wótpowědujo wašomu browseroju.",
            noDeviceTitle: "Žedna wužywajobna kamera",
            noDeviceDesc:
                "Browser namakujo žednu kameru, kótaruž móžośo wužywaś. Wopytajśo drugi browser, pśekontrolěrujśo zwisk kamery, pśekontrolěrujśo konfiguraciju kompjutra (datowy škit, graty) abo startujśo kompjuter znowego, jolic hardware by měł funkcioněrowaś.",
            permissionMedia: {
                firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
                chrome: "/resources/help-setting-camera-permission/de-DE-chrome.png",
                safari: "/resources/help-setting-camera-permission/en-US-firefox.png",
                android: "/resources/help-setting-camera-permission/de-DE-chrome.png",
                default: "/resources/help-setting-camera-permission/en-US-firefox.png",
            },
        },
        microphoneTooltip: {
            permissionDeniedTitle: "Mikrofonowy pśistup jo se blokěrował",
            permissionDeniedDesc:
                "Waš browser jo pśistup mikrofonoju za toś ten bok wótpokazał. Zwóliśo jen pśez adresowe pólo (šlosk abo symbol mikrofona) abo w nastajenjach sedła. Wobraz wótpowědujo wašomu browseroju.",
            noDeviceTitle: "Žeden wužywajobny mikrofon",
            noDeviceDesc:
                "Browser namakujo žeden mikrofon, kótaryž móžośo wužywaś. Wopytajśo drugi browser, pśekontrolěrujśo mikrofon, pśekontrolěrujśo konfiguraciju kompjutra (datowy škit, graty) abo startujśo kompjuter znowego, jolic hardware by měł funkcioněrowaś.",
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
        title: "Zmylk pśi zwězanju ze serwerom widejo-relej",
        titlePending: "Zwězanje ze serwerom widejo-relej w běgu",
        error: "Serwer TURN njedocpěju",
        content: "Serwer widejo-relej njedocpěju. Móžośo se z drugimi wužiwarjami njekomunikěrowaś.",
        solutionVpn: "Jolic se pśez VPN zwězujośo, pśetorhniśo pšosym zwisk ze swójim VPN a aktualizěrujśo web-boku.",
        solutionVpnNotAskAgain: "Rozměł. Mě zasej njewarnowaś 🫡",
        solutionHotspot:
            "Jolic sćo w wobmjezowanej syći (pśedewześowa syć...), spytajśo syć změniś. Napśikład, wutwóriśo z wašym telefonom WLAN-hotspot a zwězajśo se pśez telefon.",
        solutionNetworkAdmin: "Jolic sćo administrator syće, pśeglědajśo ",
        preparingYouNetworkGuide: 'nawod "Preparing your network"',
        refresh: "Aktualizěrowaś",
        continue: "Dalej",
        newDeviceDetected: "Nowy grat namakany {device} 🎉 Změniś? [SPACE] ignorować [ESC]",
    },
    my: {
        silentZone: "Śichy wobceŕk",
        silentZoneDesc:
            "Sćo w śichym wobcerku. Móžośo jano luźe wiźeś a słyšaś, z kótarymiž sćo. Móžośo drugich luźi w rumnje nje wiźeś abo nje słyšaś.",
        nameTag: "Wy",
        loading: "Waša kamera se zacytujo...",
    },
    disable: "Kameru deaktiwěrowaś",
    menu: {
        moreAction: "Dalše akcije",
        closeMenu: "Meny zacyniś",
        senPrivateMessage: "Pśewatne powěsće posłaś (Pśichadźe)",
        kickoffUser: "Wužiwarja wotmětowaś",
        muteAudioUser: "Audio stummschalten",
        askToMuteAudioUser: "Pšosyś, aby audio stummschalten",
        muteAudioEveryBody: "Audio za wšěch stummschalten",
        muteVideoUser: "Video stummschalten",
        askToMuteVideoUser: "Pšosyś, aby video stummschalten",
        muteVideoEveryBody: "Video za wšěch stummschalten",
        blockOrReportUser: "Wužiwarja blokěrowaś abo pśihłasowaś",
    },
    backgroundEffects: {
        imageTitle: "Wobrazki slězynka",
        videoTitle: "Wideja slězynka",
        blurTitle: "Slězynk njewjasnosć",
        resetTitle: "Slězynk efekty deaktiwěrowaś",
        title: "Slězynk efekty",
        close: "Zacyniś",
        blurAmount: "Njewjasnosć měra",
    },
};

export default camera;
