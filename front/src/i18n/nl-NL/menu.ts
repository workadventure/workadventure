import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const menu: DeepPartial<Translation["menu"]> = {
    title: "Menu",
    icon: {
        open: {
            menu: "Open menu",
            invite: "Toon uitnodiging",
            register: "Registreren",
            chat: "Open chat",
            userlist: "Lijst met gebruikers",
            openEmoji: "Open emoji-selectie popup",
            closeEmoji: "Sluit emoji-menu",
            mobile: "Open mobiel menu",
            calendar: "Open agenda",
        },
    },
    visitCard: {
        close: "Sluiten",
        sendMessage: "Verstuur bericht",
    },
    profile: {
        login: "Inloggen",
        logout: "Uitloggen",
    },
    settings: {
        videoBandwidth: {
            title: "Videokwaliteit",
            low: "Laag",
            recommended: "Aanbevolen",
            unlimited: "Onbeperkt",
        },
        shareScreenBandwidth: {
            title: "Kwaliteit van schermdeling",
            low: "Laag",
            recommended: "Aanbevolen",
            unlimited: "Onbeperkt",
        },
        language: {
            title: "Taal",
        },
        privacySettings: {
            title: "Afwezigheidsmodus",
            explanation:
                'Wanneer het WorkAdventure-tabblad in je browser niet zichtbaar is, schakelt WorkAdventure over naar de "afwezigheidsmodus"',
            cameraToggle: 'Houd camera actief in "afwezigheidsmodus"',
            microphoneToggle: 'Houd microfoon actief in "afwezigheidsmodus"',
        },
        save: "Opslaan",
        otherSettings: "Andere instellingen",
        fullscreen: "Volledig scherm",
        notifications: "Meldingen",
        chatSounds: "Geluiden van chat",
        cowebsiteTrigger: "Altijd vragen voordat websites en Jitsi Meet-ruimtes worden geopend",
        ignoreFollowRequest: "Negeer verzoeken om andere gebruikers te volgen",
    },
    invite: {
        description: "Deel de link van de kamer!",
        copy: "Kopiëren",
        share: "Delen",
        walkAutomaticallyToPosition: "Automatisch naar mijn positie lopen",
        selectEntryPoint: "Selecteer een toegangspunt",
    },
    globalMessage: {
        text: "Tekst",
        audio: "Audio",
        warning: "Uitzenden naar alle kamers in de wereld",
        enter: "Voer hier je bericht in...",
        send: "Verzenden",
    },
    globalAudio: {
        uploadInfo: "Upload een bestand",
        error: "Geen bestand geselecteerd. Je moet een bestand uploaden voordat je het kunt verzenden.",
        errorUpload:
            "Fout bij het uploaden van bestand. Controleer je bestand en probeer het opnieuw. Als het probleem aanhoudt, neem dan contact op met de beheerder.",
        dragAndDrop: "Sleep hier je bestand of klik hier om je bestand te uploaden 🎧",
    },
    contact: {
        gettingStarted: {
            title: "Aan de slag",
            description:
                "WorkAdventure stelt je in staat om een online ruimte te creëren om spontaan met anderen te communiceren. En het begint allemaal met het creëren van je eigen ruimte. Kies uit een grote selectie van prefab-kaarten door ons team.",
        },
        createMap: {
            title: "Maak je kaart",
            description: "Je kunt ook je eigen aangepaste kaart maken door de stappen van de documentatie te volgen.",
        },
    },
    about: {
        mapInfo: "Informatie over de kaart",
        mapLink: "link naar deze kaart",
        copyrights: {
            map: {
                title: "Auteursrechten van de kaart",
                empty: "De maker van de kaart heeft geen auteursrecht voor de kaart gedeclareerd.",
            },
            tileset: {
                title: "Auteursrechten van de tilesets",
                empty: "De maker van de kaart heeft geen auteursrecht voor de tilesets gedeclareerd. Dit betekent niet dat deze tilesets geen licentie hebben.",
            },
            audio: {
                title: "Auteursrechten van audiobestanden",
                empty: "De maker van de kaart heeft geen auteursrecht voor audiobestanden gedeclareerd. Dit betekent niet dat deze audiobestanden geen licentie hebben.",
            },
        },
    },
    sub: {
        profile: "Profiel",
        settings: "Instellingen",
        invite: "Uitnodigen",
        credit: "Credits",
        globalMessages: "Wereldwijde berichten",
        contact: "Contact",
        report: "Problemen melden",
    },
};

export default menu;
