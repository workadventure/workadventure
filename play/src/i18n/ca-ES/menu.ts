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
        },
    },
    visitCard: {
        close: "Tancar",
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
            unlimited: "Ilimitada",
        },
        shareScreenBandwidth: {
            title: "Calidad de compartir pantalla",
            low: "Baja",
            recommended: "Recomendada",
            unlimited: "Ilimitada",
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
        fullscreen: "Pantalla completa",
        notifications: "Notificacions",
        cowebsiteTrigger: "Preguntar sempre abans d'obrir llocs web i habitacions Jitsi Meet",
        ignoreFollowRequest: "Ignorar peticions de seguir altres usuaris",
    },
    invite: {
        description: "Compartir l'enllaç de l'habitació!",
        copy: "Copiar",
        share: "Compartir",
        walkAutomaticallyToPosition: "Caminar automàticament cap a la meva posició",
        selectEntryPoint: "Seleccioneu un punt d'entrada",
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
    sub: {
        profile: "Perfil",
        settings: "Configuració",
        invite: "Convidar",
        credit: "Crèdits",
        globalMessages: "Missatges Globals",
        contact: "Contacte",
        report: "Report issue",
    },
};

export default menu;
