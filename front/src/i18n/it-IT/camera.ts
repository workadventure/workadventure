import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    enable: {
        title: "Accendi la tua fotocamera e il microfono",
        start: "Andiamo!",
    },
    help: {
        title: "Accesso a fotocamera / microfono necessario",
        permissionDenied: "Permesso negato",
        content: "Devi consentire l'accesso alla fotocamera e al microfono nel tuo browser.",
        firefoxContent:
            'Si prega di cliccare sulla casella "Ricorda questa decisione", se non vuoi che Firefox continui a chiederti l\'autorizzazione.',
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
    },
    my: {
        silentZone: "Zona silenziosa",
        nameTag: "Tu",
    },
    disable: "Spegni la tua fotocamera",
    menu: {
        moreAction: "Altre azioni",
        closeMenu: "Chiudi menu",
        senPrivateMessage: "Invia un messaggio privato (prossimamente)",
        kickoffUser: "Espelli utente",
        muteAudioUser: "Disattiva audio",
        muteAudioEveryBody: "Disattiva audio per tutti",
        muteVideoUser: "Disattiva video",
        muteVideoEveryBody: "Disattiva video per tutti",
        pin: "Fissa",
        blockOrReportUser: "Blocca o segnala utente",
    },
};

export default camera;
