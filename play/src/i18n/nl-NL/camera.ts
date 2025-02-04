import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const camera: DeepPartial<Translation["camera"]> = {
    enable: {
        title: "Zet je camera en microfoon aan",
        start: "Laten we gaan!",
    },
    help: {
        title: "Camera / Microfoon toegang nodig",
        permissionDenied: "Toegang geweigerd",
        content: "Je moet toegang tot de camera en microfoon toestaan in je browser.",
        firefoxContent:
            'Vink het vakje "Deze beslissing onthouden" aan als je niet wilt dat Firefox je steeds om toestemming vraagt.',
        continue: "Doorgaan zonder webcam",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
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
    },
    my: {
        silentZone: "Stille zone",
        nameTag: "Jij",
    },
    disable: "Zet je camera uit",
    menu: {
        moreAction: "Meer acties",
        closeMenu: "Sluit menu",
        senPrivateMessage: "Stuur een privébericht (binnenkort beschikbaar)",
        kickoffUser: "Gebruiker verwijderen",
        muteAudioUser: "Audio dempen",
        muteAudioEveryBody: "Audio dempen voor iedereen",
        muteVideoUser: "Video dempen",
        muteVideoEveryBody: "Video dempen voor iedereen",
        pin: "Vastmaken",
        blockOrReportUser: "Gebruiker blokkeren of rapporteren",
    },
};

export default camera;
