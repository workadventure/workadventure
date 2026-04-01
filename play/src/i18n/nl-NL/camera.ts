import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const camera: DeepPartial<Translation["camera"]> = {
    editCam: "Camera bewerken",
    editMic: "Microfoon bewerken",
    editSpeaker: "Audio-uitvoer bewerken",
    active: "Actief",
    disabled: "Uitgeschakeld",
    notRecommended: "Niet aanbevolen",
    enable: {
        title: "Zet je camera en microfoon aan",
        start: "Welkom op onze pagina voor het configureren van audio- en videog apparaten! Vind hier de tools om je online ervaring te verbeteren. Pas de instellingen aan naar je voorkeuren om eventuele problemen op te lossen. Zorg ervoor dat je hardware correct is aangesloten en up-to-date is. Verken en test verschillende configuraties om te vinden wat het beste voor jou werkt.",
    },
    help: {
        title: "Camera / Microfoon toegang nodig",
        permissionDenied: "Toegang geweigerd",
        content: "Je moet toegang tot de camera en microfoon toestaan in je browser.",
        firefoxContent:
            'Vink het vakje "Deze beslissing onthouden" aan als je niet wilt dat Firefox je steeds om toestemming vraagt.',
        allow: "Webcam toestaan",
        continue: "Doorgaan zonder webcam",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
        tooltip: {
            permissionDeniedTitle: "Cameratoegang geblokkeerd",
            permissionDeniedDesc:
                "Je browser heeft cameratoegang voor deze site geweigerd. Sta het toe via de adresbalk (slot- of camera-icoon) of in de site-instellingen. De afbeelding hieronder hoort bij je browser.",
            noDeviceTitle: "Geen bruikbare camera",
            noDeviceDesc:
                "Je browser ziet geen camera die je kunt gebruiken. Probeer een andere browser, controleer of een camera is aangesloten of start de computer opnieuw op als het apparaat zou moeten werken.",
            permissionMedia: {
                firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
                chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
                safari: "/resources/help-setting-camera-permission/en-US-firefox.png",
                android: "/resources/help-setting-camera-permission/en-US-firefox.png",
                default: "/resources/help-setting-camera-permission/en-US-firefox.png",
            },
        },
        microphoneTooltip: {
            permissionDeniedTitle: "Microfoontoegang geblokkeerd",
            permissionDeniedDesc:
                "Je browser heeft microfoontoegang voor deze site geweigerd. Sta het toe via de adresbalk (slot- of microfoon-icoon) of in de site-instellingen. De afbeelding hieronder hoort bij je browser.",
            noDeviceTitle: "Geen bruikbare microfoon",
            noDeviceDesc:
                "Je browser ziet geen microfoon die je kunt gebruiken. Probeer een andere browser, controleer of een microfoon is aangesloten of start de computer opnieuw op als het apparaat zou moeten werken.",
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
        title: "Verbindingsfout met video relay server",
        titlePending: "Verbinding met video relay server in behandeling",
        error: "TURN-server is niet bereikbaar",
        content:
            "De video relay server kan niet worden bereikt. Je kunt mogelijk niet met andere gebruikers communiceren.",
        solutionVpn:
            "Als je <strong>via een VPN verbinding maakt</strong>, verbreek dan de verbinding met je VPN en vernieuw de webpagina.",
        solutionVpnNotAskAgain: "Begrepen. Waarschuw me niet opnieuw 🫡",
        solutionHotspot:
            "Als je je op een beperkt netwerk bevindt (bedrijfsnetwerk...), probeer dan van netwerk te wisselen. Maak bijvoorbeeld een <strong>Wifi-hotspot</strong> met je telefoon en maak verbinding via je telefoon.",
        solutionNetworkAdmin: "Als je een <strong>netwerkbeheerder</strong> bent, bekijk dan de ",
        preparingYouNetworkGuide: '"Je netwerk voorbereiden" gids',
        refresh: "Vernieuwen",
        continue: "Doorgaan",
        newDeviceDetected: "Nieuw apparaat gedetecteerd {device} 🎉 Wisselen? [SPATIE] Negeren [ESC]",
    },
    my: {
        silentZone: "Stille zone",
        silentZoneDesc:
            "Je bevindt je in een stille zone. Je kunt alleen de mensen zien en horen met wie je samen bent. Je kunt de andere mensen in de ruimte niet zien of horen.",
        nameTag: "Jij",
        loading: "Je camera wordt geladen...",
    },
    disable: "Zet je camera uit",
    menu: {
        moreAction: "Meer acties",
        closeMenu: "Sluit menu",
        senPrivateMessage: "Stuur een privébericht (binnenkort beschikbaar)",
        kickoffUser: "Gebruiker verwijderen",
        muteAudioUser: "Audio dempen",
        askToMuteAudioUser: "Vragen om audio te dempen",
        muteAudioEveryBody: "Audio dempen voor iedereen",
        muteVideoUser: "Video dempen",
        askToMuteVideoUser: "Vragen om video te dempen",
        muteVideoEveryBody: "Video dempen voor iedereen",
        blockOrReportUser: "Gebruiker blokkeren of rapporteren",
    },
    backgroundEffects: {
        imageTitle: "Achtergrondafbeeldingen",
        videoTitle: "Achtergrondvideo's",
        blurTitle: "Achtergrondvervaging",
        resetTitle: "Achtergrondeffecten uitschakelen",
        title: "Achtergrondeffecten",
        close: "Sluiten",
        blurAmount: "Vervagingshoeveelheid",
    },
};

export default camera;
