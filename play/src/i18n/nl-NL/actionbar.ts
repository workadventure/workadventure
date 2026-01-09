import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    understand: "Begrepen!",
    edit: "Bewerken",
    cancel: "Annuleren",
    close: "Sluiten",
    login: "Inloggen",
    map: "Gereedschappen",
    profil: "Bewerk je naam",
    startScreenSharing: "Schermdeling starten",
    stopScreenSharing: "Schermdeling stoppen",
    screenSharingMode: "Schermdeling modus",
    calendar: "Kalender",
    todoList: "Takenlijst",
    woka: "Pas je avatar aan",
    companion: "Metgezel toevoegen",
    test: "Test mijn instellingen",
    editCamMic: "Bewerk camera / microfoon",
    allSettings: "Alle instellingen",
    globalMessage: "Globaal bericht verzenden",
    mapEditor: "Kaarteditor",
    mapEditorMobileLocked: "Kaarteditor is vergrendeld in mobiele modus",
    mapEditorLocked: "Kaarteditor is vergrendeld 🔐",
    app: "Applicaties van derden",
    camera: {
        disabled: "Je camera is uitgeschakeld",
        activate: "Activeer je camera",
        noDevices: "Geen camera-apparaat gevonden",
        setBackground: "Achtergrond instellen",
        blurEffects: "Vervagingseffecten",
        disableBackgroundEffects: "Achtergrondeffecten uitschakelen",
        close: "Sluiten",
    },
    microphone: {
        disabled: "Je microfoon is uitgeschakeld",
        activate: "Activeer je microfoon",
        noDevices: "Geen microfoonapparaat gevonden",
    },
    speaker: {
        disabled: "Je luidspreker is uitgeschakeld",
        activate: "Activeer je luidspreker",
        noDevices: "Geen luidsprekerapparaat gevonden",
    },
    status: {
        ONLINE: "Online",
        AWAY: "Afwezig",
        BACK_IN_A_MOMENT: "Zo terug",
        DO_NOT_DISTURB: "Niet storen",
        BUSY: "Bezet",
        OFFLINE: "Offline",
        SILENT: "Stil",
        JITSI: "In een vergadering",
        BBB: "In een vergadering",
        DENY_PROXIMITY_MEETING: "Niet beschikbaar",
        SPEAKER: "In een vergadering",
        LIVEKIT: "In een vergadering",
        LISTENER: "In een vergadering",
    },
    subtitle: {
        camera: "Camera",
        microphone: "Microfoon",
        speaker: "Audio-uitvoer",
    },
    help: {
        chat: {
            title: "Tekstbericht verzenden",
            desc: "Deel je ideeën of start een discussie, direct schriftelijk. Eenvoudig, duidelijk, effectief.",
        },
        users: {
            title: "Gebruikerslijst weergeven",
            desc: "Zie wie er is, ga naar hun visitekaartje, stuur ze een bericht of loop naar ze toe met één klik!",
        },
        emoji: {
            title: "Een emoji weergeven",
            desc: "Druk uit hoe je je voelt met slechts één klik met emoji-reacties. Gewoon tikken en gaan!",
        },
        audioManager: {
            title: "Volume van omgevingsgeluiden",
            desc: "Configureer het audiovolume door hier te klikken.",
            pause: "Klik hier om de audio te pauzeren",
            play: "Klik hier om de audio af te spelen",
            stop: "Klik hier om de audio te stoppen",
        },
        audioManagerNotAllowed: {
            title: "Omgevingsgeluiden geblokkeerd",
            desc: "Uw browser heeft voorkomen dat omgevingsgeluiden worden afgespeeld. Klik op het pictogram om de weergave te starten.",
        },
        follow: {
            title: "Vragen om te volgen",
            desc: "Je kunt een gebruiker vragen je te volgen, en als dit verzoek wordt geaccepteerd, zal zijn Woka je automatisch volgen, waardoor een naadloze verbinding wordt gelegd.",
        },
        unfollow: {
            title: "Stoppen met volgen",
            desc: "Je kunt er op elk moment voor kiezen om een gebruiker niet meer te volgen. Je Woka zal dan stoppen met volgen, waardoor je je bewegingsvrijheid terugkrijgt.",
        },
        lock: {
            title: "Gesprek vergrendelen",
            desc: "Door deze functie in te schakelen, zorg je ervoor dat niemand aan de discussie kan deelnemen. Je bent de meester van je ruimte, en alleen degenen die al aanwezig zijn, kunnen interacteren.",
        },
        megaphone: {
            title: "Megafoon stoppen",
            desc: "Stop met het uitzenden van je bericht naar alle gebruikers.",
        },
        mic: {
            title: "Microfoon in-/uitschakelen",
            desc: "Schakel je microfoon in of uit zodat anderen je kunnen horen tijdens de discussie.",
        },
        micDisabledByStatus: {
            title: "Microfoon uitgeschakeld",
            desc: 'Je microfoon is uitgeschakeld omdat je in de status "{status}" bent.',
        },
        cam: {
            title: "Camera in-/uitschakelen",
            desc: "Schakel je camera in of uit om je video aan andere deelnemers te tonen.",
        },
        camDisabledByStatus: {
            title: "Camera uitgeschakeld",
            desc: 'Je camera is uitgeschakeld omdat je in de status "{status}" bent.',
        },
        share: {
            title: "Je scherm delen",
            desc: "Wil je je scherm delen met andere gebruikers? Dat kan! Je kunt je scherm aan iedereen in de chat tonen, en je kunt kiezen om je hele scherm of alleen een specifiek venster te delen.",
        },
        apps: {
            title: "Applicaties van derden",
            desc: "Je hebt de vrijheid om externe applicaties te navigeren terwijl je in onze applicatie blijft, voor een soepele en verrijkte ervaring.",
        },
        roomList: {
            title: "Kamerlijst",
            desc: "Bekijk de lijst met kamers om te zien wie er is en doe met één klik mee aan een gesprek.",
        },
        calendar: {
            title: "Kalender",
            desc: "Bekijk je aanstaande vergaderingen en doe er direct vanuit WorkAdventure aan mee.",
        },
        todolist: {
            title: "Takenlijst",
            desc: "Beheer je taken van de dag zonder je werkruimte te verlaten.",
        },
        pictureInPicture: {
            title: "Picture in picture",
            descDisabled:
                "Helaas is deze functie niet beschikbaar op uw apparaat ❌. Probeer een ander apparaat of browser te gebruiken, zoals Chrome of Edge, om toegang te krijgen tot deze functie.",
            desc: "U kunt de picture-in-picture functie gebruiken om een video of presentatie te bekijken terwijl u in een gesprek bent. Klik gewoon op het picture-in-picture pictogram en geniet van uw inhoud.",
        },
    },
    listStatusTitle: {
        enable: "Wijzig je status",
    },
    externalModule: {
        status: {
            onLine: "Status is ok ✅",
            offLine: "Status is offline ❌",
            warning: "Status is waarschuwing ⚠️",
            sync: "Status wordt gesynchroniseerd 🔄",
        },
    },
    featureNotAvailable: "Functie niet beschikbaar voor je kamer 😭",
    issueReport: {
        menuAction: "Een probleem melden",
        formTitle: "Een probleem melden",
        emailLabel: "E-mail (niet verplicht)",
        nameLabel: "Naam (niet verplicht)",
        descriptionLabel: "Beschrijving* (verplicht)",
        descriptionPlaceholder: "Wat is het probleem? Wat had je verwacht?",
        submitButtonLabel: "Bugrapport verzenden",
        cancelButtonLabel: "Annuleren",
        confirmButtonLabel: "Bevestigen",
        addScreenshotButtonLabel: "Screenshot toevoegen",
        removeScreenshotButtonLabel: "Screenshot verwijderen",
        successMessageText: "Bedankt voor je melding! We zullen deze zo snel mogelijk bekijken.",
        highlightToolText: "Markeren",
        hideToolText: "Verbergen",
        removeHighlightText: "Verwijderen",
    },
    personalDesk: {
        label: "Naar mijn bureau gaan",
        unclaim: "Mijn bureau vrijgeven",
        errorNoUser: "Kan uw gebruikersinformatie niet vinden",
        errorNotFound: "U heeft nog geen persoonlijk bureau",
        errorMoving: "Kan uw persoonlijke bureau niet bereiken",
        errorUnclaiming: "Kan uw persoonlijke bureau niet vrijgeven",
    },
};

export default actionbar;
