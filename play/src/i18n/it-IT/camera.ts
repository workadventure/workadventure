import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    editCam: "Modifica fotocamera",
    editMic: "Modifica microfono",
    editSpeaker: "Modifica uscita audio",
    active: "Attivo",
    disabled: "Disabilitato",
    notRecommended: "Non raccomandato",
    enable: {
        title: "Accendi la tua fotocamera e il microfono",
        start: "Benvenuto nella nostra pagina di configurazione dei dispositivi audio e video! Trova qui gli strumenti per migliorare la tua esperienza online. Regola le impostazioni in base alle tue preferenze per risolvere eventuali problemi. Assicurati che il tuo hardware sia correttamente collegato e aggiornato. Esplora e testa diverse configurazioni per trovare quella che funziona meglio per te.",
    },
    help: {
        title: "Accesso a fotocamera / microfono necessario",
        permissionDenied: "Permesso negato",
        content: "Devi consentire l'accesso alla fotocamera e al microfono nel tuo browser.",
        firefoxContent:
            'Si prega di cliccare sulla casella "Ricorda questa decisione", se non vuoi che Firefox continui a chiederti l\'autorizzazione.',
        allow: "Consenti webcam",
        continue: "Continua senza webcam",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
    },
    webrtc: {
        title: "Errore di connessione al server di inoltro video",
        titlePending: "Connessione al server di inoltro video in sospeso",
        error: "Il server TURN non è raggiungibile",
        content:
            "Il server di inoltro video non può essere raggiunto. Potresti non essere in grado di comunicare con altri utenti.",
        solutionVpn:
            "Se stai <strong>connettendoti tramite una VPN</strong>, disconnettiti dalla VPN e ricarica la pagina web.",
        solutionVpnNotAskAgain: "Capito. Non avvisarmi più 🫡",
        solutionHotspot:
            "Se sei su una rete limitata (rete aziendale...), prova a cambiare rete. Ad esempio, crea un <strong>hotspot Wifi</strong> con il tuo telefono e connettiti tramite il telefono.",
        solutionNetworkAdmin: "Se sei un <strong>amministratore di rete</strong>, rivedi la ",
        preparingYouNetworkGuide: 'guida "Preparare la tua rete"',
        refresh: "Ricarica",
        continue: "Continua",
        newDeviceDetected: "Nuovo dispositivo rilevato {device} 🎉 Cambiare? [SPAZIO]",
    },
    my: {
        silentZone: "Zona silenziosa",
        silentZoneDesc:
            "Ti trovi in una zona silenziosa. Puoi vedere e sentire solo le persone con cui sei. Non puoi vedere o sentire le altre persone nella stanza.",
        nameTag: "Tu",
        loading: "Caricamento della tua fotocamera...",
    },
    disable: "Spegni la tua fotocamera",
    menu: {
        moreAction: "Altre azioni",
        closeMenu: "Chiudi menu",
        senPrivateMessage: "Invia un messaggio privato (prossimamente)",
        kickoffUser: "Espelli utente",
        muteAudioUser: "Disattiva audio",
        askToMuteAudioUser: "Chiedi di disattivare l'audio",
        muteAudioEveryBody: "Disattiva audio per tutti",
        muteVideoUser: "Disattiva video",
        askToMuteVideoUser: "Chiedi di disattivare il video",
        muteVideoEveryBody: "Disattiva video per tutti",
        blockOrReportUser: "Blocca o segnala utente",
    },
    backgroundEffects: {
        imageTitle: "Immagini di sfondo",
        videoTitle: "Video di sfondo",
        blurTitle: "Sfocatura di sfondo",
        resetTitle: "Disattiva effetti di sfondo",
        title: "Effetti di sfondo",
        close: "Chiudi",
        blurAmount: "Quantità di sfocatura",
    },
};

export default camera;
