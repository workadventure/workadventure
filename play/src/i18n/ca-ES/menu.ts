import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    title: "Menú",
    icon: {
        open: {
            menu: "Obrir menú",
            invite: "Mostrar invitació",
            register: "Registre",
            chat: "Obrir chat",
            userlist: "Lista de utilizadores",
            openEmoji: "Obre la finestra emergent de l'emoji seleccionat",
            closeEmoji: "Tanca el menú d'emojis",
            mobile: "Obrir menú mòbil",
            calendar: "Obrir calendari",
            todoList: "Obrir la llista de tasques",
        },
    },
    visitCard: {
        close: "Tancar",
        sendMessage: "Enviar missatge",
    },
    profile: {
        login: "Iniciar sessió",
        logout: "Tancar sessió",
    },
    settings: {
        videoBandwidth: {
            title: "Calidad de video",
            low: "Baja",
            recommended: "Recomendada",
            high: "High",
        },
        shareScreenBandwidth: {
            title: "Calidad de compartir pantalla",
            low: "Baja",
            recommended: "Recomendada",
            high: "High",
        },
        bandwidthConstrainedPreference: {
            title: "Si l'amplada de banda de la xarxa és limitada",
            maintainFramerateTitle: "Mantenir animacions fluides",
            maintainFramerateDescription:
                "Prioritza els fotogrames per segon sobre la resolució. Fes-ho servir quan la fluïdesa sigui important, com en l'streaming de videojocs.",
            maintainResolutionTitle: "Mantenir el text llegible",
            maintainResolutionDescription:
                "Prioritza la resolució sobre els fotogrames per segon. Fes-ho servir quan la llegibilitat del text sigui important, com en presentacions o quan comparteixes codi.",
            balancedTitle: "Equilibrar fluïdesa i resolució",
            balancedDescription: "Intenta mantenir un equilibri entre fluïdesa i resolució.",
        },
        language: {
            title: "Idioma",
        },
        privacySettings: {
            title: "Mode no present",
            explanation:
                'Quan la pestanya de WorkAdventure al seu navegador no és visible, WorkAdventure cambia al "mode no present"',
            cameraToggle: 'Mantenir la càmera activa en "mode no present"',
            microphoneToggle: 'Mantenir el micròfon actiu en "mode no present"',
        },
        save: "Guardar",
        otherSettings: "Totes les configuracions",
        fullscreen: "Pantalla completa",
        notifications: "Notificacions",
        enablePictureInPicture: "Activar picture-in-picture",
        chatSounds: "Sons del xat",
        cowebsiteTrigger: "Preguntar sempre abans d'obrir llocs web i habitacions Jitsi Meet",
        ignoreFollowRequest: "Ignorar peticions de seguir altres usuaris",
        proximityDiscussionVolume: "Volum de les bombolles de discussió",
        blockAudio: "Bloquejar sons ambientals i música",
        disableAnimations: "Desactivar les animacions del mapa",
        bubbleSound: "So de les bombolles",
        bubbleSoundOptions: {
            ding: "Ding",
            wobble: "Wobble",
        },
        displayVideoQualityStats: "Mostrar estadístiques de qualitat de vídeo",
    },
    invite: {
        description: "Compartir l'enllaç de l'habitació!",
        copy: "Copiar",
        copied: "Copiat",
        share: "Compartir",
        walkAutomaticallyToPosition: "Caminar automàticament cap a la meva posició",
        selectEntryPoint: "Utilitzar un altre punt d'entrada",
        selectEntryPointSelect: "Seleccioneu el punt d'entrada pel qual arribaran els usuaris",
    },
    globalMessage: {
        text: "Text",
        audio: "Audio",
        warning: "Emissió a totes les habitacions del món",
        enter: "Introduïu el vostre missatge aquí...",
        send: "Enviar",
    },
    globalAudio: {
        uploadInfo: "Pujar un arxiu",
        error: "Cap arxiu seleccionat. Teniu que pujar un arxiu abans d'enviar-lo.",
        errorUpload:
            "Error en carregar el fitxer. Comproveu el vostre fitxer i torneu-ho a provar. Si el problema persisteix, poseu-vos en contacte amb l'administrador.",
        dragAndDrop: "Arrossegar i deixar anar o fer clic aquí per pujar el vostre fitxer 🎧",
    },
    contact: {
        gettingStarted: {
            title: "Començar",
            description:
                "WorkAdventure us permet crear un espai en línia per comunicar-vos espontàneament amb altres. I tot comença creant el vostre propi espai. Escolliu entre una gran selecció de mapes prefabricats pel nostre equip.",
        },
        createMap: {
            title: "Crear el vostre mapa",
            description: "També podeu crear el vostre propi mapa personalitzat seguint el passos de la documentació.",
        },
    },
    about: {
        mapInfo: "Informació al mapa",
        mapLink: "Enllaç a aquest mapa",
        copyrights: {
            map: {
                title: "Drets d'autor del mapa",
                empty: "El creador del mapa no ha declarat drets d'autor del mapa.",
            },
            tileset: {
                title: "Drets d'autor de les rajoles",
                empty: "El creador del mapa no ha declarat drets d'autor de les rajoles. Això no significa que aquestes rajoles no tinguin llicència.",
            },
            audio: {
                title: "Drets d'autor dels arxius d'audio",
                empty: "El creador del mapa no ha declarat drets d'autor dels arxius d'audio. Això no significa que aquests arxius d'audio no tinguin llicència.",
            },
        },
    },
    chat: {
        matrixIDLabel: "El vostre ID Matrix",
        settings: "Configuració",
        resetKeyStorageUpButtonLabel: "Restablir l'emmagatzematge de claus",
        resetKeyStorageConfirmationModal: {
            title: "Confirmació de restabliment de l'emmagatzematge de claus",
            content: "Esteu a punt de restablir l'emmagatzematge de claus. Esteu segur?",
            warning:
                "Restablir l'emmagatzematge de claus eliminarà la vostra sessió actual i tots els usuaris de confiança. Podríeu perdre l'accés a alguns missatges passats i ja no serà reconegut com a usuari de confiança. Assegureu-vos d'entendre completament les conseqüències d'aquesta acció abans de continuar.",
            cancel: "Cancel·lar",
            continue: "Continuar",
        },
    },
    sub: {
        profile: "Perfil",
        settings: "Configuració",
        invite: "Convidar",
        credit: "Crèdits",
        globalMessages: "Missatges Globals",
        contact: "Contacte",
        report: "Reportar problemes",
        chat: "Xat",
        help: "Ajuda i tutorials",
        contextualActions: "Accions contextuals",
        shortcuts: "Dreceres",
    },
    shortcuts: {
        title: "Dreceres de teclat",
        keys: "Drecera",
        actions: "Acció",
        moveUp: "Moure amunt",
        moveDown: "Moure avall",
        moveLeft: "Moure a l'esquerra",
        moveRight: "Moure a la dreta",
        speedUp: "Córrer",
        interact: "Interactuar",
        follow: "Seguir",
        openChat: "Obrir el xat",
        openUserList: "Obrir la llista d'usuaris",
        toggleMapEditor: "Mostrar/Ocultar l'editor de mapes",
        rotatePlayer: "Girar el jugador",
        emote1: "Emoticona 1",
        emote2: "Emoticona 2",
        emote3: "Emoticona 3",
        emote4: "Emoticona 4",
        emote5: "Emoticona 5",
        emote6: "Emoticona 6",
        openSayPopup: "Obrir la finestra emergent en mode dir",
        openThinkPopup: "Obrir la finestra emergent en mode pensar",
        walkMyDesk: "Caminar fins al meu escriptori",
    },
};

export default menu;
