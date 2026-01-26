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
            todoList: "Open takenlijst",
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
            high: "High",
        },
        shareScreenBandwidth: {
            title: "Kwaliteit van schermdeling",
            low: "Laag",
            recommended: "Aanbevolen",
            high: "High",
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
        enablePictureInPicture: "Picture-in-picture inschakelen",
        chatSounds: "Geluiden van chat",
        cowebsiteTrigger: "Altijd vragen voordat websites en Jitsi Meet-ruimtes worden geopend",
        ignoreFollowRequest: "Negeer verzoeken om andere gebruikers te volgen",
        proximityDiscussionVolume: "Volume van nabijheidsdiscussies",
        blockAudio: "Omgevingsgeluiden en muziek blokkeren",
        disableAnimations: "Kaartanimaties uitschakelen",
        bubbleSound: "Bubbelgeluid",
        bubbleSoundOptions: {
            ding: "Ding",
            wobble: "Wobble",
        },
        displayVideoQualityStats: "Videokwaliteitsstatistieken weergeven",
    },
    invite: {
        description: "Deel de link van de kamer!",
        copy: "Kopiëren",
        copied: "Gekopieerd",
        share: "Delen",
        walkAutomaticallyToPosition: "Automatisch naar mijn positie lopen",
        selectEntryPoint: "Gebruik een ander toegangspunt",
        selectEntryPointSelect: "Selecteer het toegangspunt waar gebruikers zullen arriveren",
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
    chat: {
        matrixIDLabel: "Je Matrix ID",
        settings: "Instellingen",
        resetKeyStorageUpButtonLabel: "Reset je sleutelopslag",
        resetKeyStorageConfirmationModal: {
            title: "Bevestiging van reset van sleutelopslag",
            content: "Je staat op het punt de sleutelopslag te resetten. Weet je het zeker?",
            warning:
                "Het resetten van de sleutelopslag zal je huidige sessie en alle vertrouwde gebruikers verwijderen. Je zou toegang kunnen verliezen tot sommige eerdere berichten en je zult niet langer worden herkend als een vertrouwde gebruiker. Zorg ervoor dat je de gevolgen van deze actie volledig begrijpt voordat je doorgaat.",
            cancel: "Annuleren",
            continue: "Doorgaan",
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
        chat: "Chat",
        help: "Help & tutorials",
        contextualActions: "Contextuele acties",
        shortcuts: "Sneltoetsen",
    },
    shortcuts: {
        title: "Toetsenbordsneltoetsen",
        keys: "Sneltoets",
        actions: "Actie",
        moveUp: "Omhoog bewegen",
        moveDown: "Omlaag bewegen",
        moveLeft: "Naar links bewegen",
        moveRight: "Naar rechts bewegen",
        speedUp: "Rennen",
        interact: "Interacteren",
        follow: "Volgen",
        openChat: "Chat openen",
        openUserList: "Gebruikerslijst openen",
        toggleMapEditor: "Kaarteditor tonen/verbergen",
        rotatePlayer: "Speler roteren",
        emote1: "Emotie 1",
        emote2: "Emotie 2",
        emote3: "Emotie 3",
        emote4: "Emotie 4",
        emote5: "Emotie 5",
        emote6: "Emotie 6",
        openSayPopup: "Zeg-popup openen",
        openThinkPopup: "Denk-popup openen",
        walkMyDesk: "Naar mijn bureau lopen",
    },
};

export default menu;
