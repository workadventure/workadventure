import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    editCam: "Editar càmera",
    editMic: "Editar micròfon",
    editSpeaker: "Editar sortida d'àudio",
    active: "Actiu",
    disabled: "Desactivat",
    notRecommended: "No recomanat",
    enable: {
        title: "Encendre la càmera i el micròfon",
        start: "Benvigut a la nostra pàgina de configuració de dispositius d'àudio i vídeo! Trobeu aquí les eines per millorar la vostra experiència en línia. Ajusteu la configuració segons les vostres preferències per resoldre qualsevol problema potencial. Assegureu-vos que el vostre maquinari estigui connectat correctament i actualitzat. Exploreu i proveu diferents configuracions per trobar la que millor us funciona.",
    },
    help: {
        title: "Es necessita accéss a la càmera/micròfon",
        permissionDenied: "Permís denegat",
        content: "Ha de permetre accés a la càmera i el micròfon al navegador.",
        firefoxContent:
            'Si us plau, feu clic a la caixa "Recordar aquesta decisió", si no voleu que Firefox sigui demanant autorització.',
        allow: "Permetre la webcam",
        continue: "Continuar sense càmera",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
    },
    webrtc: {
        title: "Error de connexió amb el servidor de retransmissió de vídeo",
        titlePending: "Connexió amb el servidor de retransmissió de vídeo pendent",
        error: "El servidor TURN no és accessible",
        content:
            "El servidor de retransmissió de vídeo no es pot arribar. Pot ser que no pugueu comunicar-vos amb altres usuaris.",
        solutionVpn:
            "Si us esteu <strong>connectant mitjançant una VPN</strong>, desconnecteu-vos de la VPN i actualitzeu la pàgina web.",
        solutionVpnNotAskAgain: "Entès. No em tornis a avisar 🫡",
        solutionHotspot:
            "Si esteu en una xarxa restringida (xarxa d'empresa...), proveu de canviar de xarxa. Per exemple, creeu un <strong>punt d'accés Wifi</strong> amb el vostre telèfon i connecteu-vos mitjançant el telèfon.",
        solutionNetworkAdmin: "Si sou un <strong>administrador de xarxa</strong>, reviseu la ",
        preparingYouNetworkGuide: 'guia "Preparant la vostra xarxa"',
        refresh: "Actualitzar",
        continue: "Continuar",
        newDeviceDetected: "Nou dispositiu detectat {device} 🎉 Canviar? [ESPAI]",
    },
    my: {
        silentZone: "Zona silenciosa",
        silentZoneDesc:
            "Esteu en una zona silenciosa. Només podeu veure i sentir les persones amb qui esteu. No podeu veure ni sentir les altres persones a la sala.",
        nameTag: "Vós",
        loading: "Carregant la vostra càmera...",
    },
    disable: "Apagueu la càmera",
    menu: {
        moreAction: "Més accions",
        closeMenu: "Tancar el menú",
        senPrivateMessage: "Enviar un missatge privat (pròximament)",
        kickoffUser: "Expulsar usuari",
        muteAudioUser: "Silenciar audio",
        askToMuteAudioUser: "Demanar de silenciar l'àudio",
        muteAudioEveryBody: "Silenciar audio per a tothom",
        muteVideoUser: "Silenciar vídeo",
        askToMuteVideoUser: "Demanar de silenciar el vídeo",
        muteVideoEveryBody: "Silenciar vídeo per a tothom",
        blockOrReportUser: "Bloquejar o informar d'usuari",
    },
    backgroundEffects: {
        imageTitle: "Imatges de fons",
        videoTitle: "Vídeos de fons",
        blurTitle: "Desenfocament de fons",
        resetTitle: "Desactivar els efectes de fons",
        title: "Efectes de fons",
        close: "Tancar",
        blurAmount: "Quantitat de desenfocament",
    },
};

export default camera;
