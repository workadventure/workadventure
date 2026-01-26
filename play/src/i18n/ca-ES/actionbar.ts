import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    understand: "Entesos!",
    edit: "Editar",
    cancel: "Cancel·lar",
    close: "Tancar",
    login: "Iniciar sessió",
    map: "Eines",
    profil: "Editar el teu nom",
    startScreenSharing: "Iniciar compartir pantalla",
    stopScreenSharing: "Aturar compartir pantalla",
    screenSharingMode: "Mode compartir pantalla",
    calendar: "Calendari",
    todoList: "Llista de tasques",
    woka: "Personalitzar el teu avatar",
    companion: "Afegir company",
    test: "Provar la meva configuració",
    editCamMic: "Editar càmera / micròfon",
    allSettings: "Totes les configuracions",
    globalMessage: "Enviar missatge global",
    mapEditor: "Editor de mapa",
    mapEditorMobileLocked: "L'editor de mapa està bloquejat en mode mòbil",
    mapEditorLocked: "L'editor de mapa està bloquejat 🔐",
    app: "Aplicacions de tercers",
    camera: {
        disabled: "La teva càmera està desactivada",
        activate: "Activar la teva càmera",
        noDevices: "No s'ha trobat cap dispositiu de càmera",
        setBackground: "Establir fons",
        blurEffects: "Efectes de desenfocament",
        disableBackgroundEffects: "Desactivar efectes de fons",
        close: "Tancar",
    },
    microphone: {
        disabled: "El teu micròfon està desactivat",
        activate: "Activar el teu micròfon",
        noDevices: "No s'ha trobat cap dispositiu de micròfon",
    },
    speaker: {
        disabled: "El teu altaveu està desactivat",
        activate: "Activar el teu altaveu",
        noDevices: "No s'ha trobat cap dispositiu d'altaveu",
    },
    status: {
        ONLINE: "En línia",
        AWAY: "Absent",
        BACK_IN_A_MOMENT: "Torno en un moment",
        DO_NOT_DISTURB: "No molestar",
        BUSY: "Ocupat",
        OFFLINE: "Desconnectat",
        SILENT: "Silenciós",
        JITSI: "En una reunió",
        BBB: "En una reunió",
        DENY_PROXIMITY_MEETING: "No disponible",
        SPEAKER: "En una reunió",
        LIVEKIT: "En una reunió",
        LISTENER: "En una reunió",
    },
    subtitle: {
        camera: "Càmera",
        microphone: "Micròfon",
        speaker: "Sortida d'àudio",
    },
    background: {
        settings: "Configuració",
        cameraBackground: "Fons de la càmera",
        noEffect: "Sense efecte",
        blur: "Desenfocament",
        blurSmall: "Desenfocament petit",
        blurMiddle: "Desenfocament mitjà",
        blurHigh: "Desenfocament alt",
        images: "Imatges",
        videos: "Vídeos",
    },
    help: {
        chat: {
            title: "Enviar missatge de text",
            desc: "Comparteix les teves idees o inicia una discussió, directament per escrit. Simple, clar, efectiu.",
        },
        users: {
            title: "Mostrar llista d'usuaris",
            desc: "Veure qui hi és, accedir a la seva targeta de visita, enviar-los un missatge o acostar-te a ells amb un clic!",
        },
        emoji: {
            title: "Mostrar un emoji",
            desc: "Expressa com et sents amb un sol clic utilitzant reaccions emoji. Només toca i ja està!",
        },
        audioManager: {
            title: "Volum dels sons ambientals",
            desc: "Configureu el volum d'àudio fent clic aquí.",
            pause: "Feu clic aquí per posar en pausa l'àudio",
            play: "Feu clic aquí per reproduir l'àudio",
            stop: "Feu clic aquí per aturar l'àudio",
        },
        audioManagerNotAllowed: {
            title: "Sons ambientals bloquejats",
            desc: "El vostre navegador ha impedit la reproducció de sons ambientals. Feu clic a la icona per iniciar la reproducció.",
        },
        follow: {
            title: "Demanar que et segueixin",
            desc: "Pots demanar a un usuari que et segueixi, i si aquesta sol·licitud és acceptada, el seu Woka et seguirà automàticament, establint així una connexió fluida.",
        },
        unfollow: {
            title: "Deixar de seguir",
            desc: "Pots triar deixar de seguir un usuari en qualsevol moment. El teu Woka deixarà de seguir-los, retornant-te la teva llibertat de moviment.",
        },
        lock: {
            title: "Bloquejar conversa",
            desc: "En habilitar aquesta funció, t'assegures que ningú pugui unir-se a la discussió. Ets el mestre del teu espai, i només els que ja estan presents poden interactuar.",
        },
        megaphone: {
            title: "Aturar megàfon",
            desc: "Deixa de transmetre el teu missatge a tots els usuaris.",
        },
        mic: {
            title: "Activar/desactivar el teu micròfon",
            desc: "Activa o talla el teu micròfon perquè altres et sentin durant la discussió.",
        },
        micDisabledByStatus: {
            title: "Micròfon desactivat",
            desc: 'El teu micròfon està desactivat perquè estàs en estat "{status}".',
        },
        cam: {
            title: "Activar/desactivar la teva càmera",
            desc: "Activa o talla la teva càmera per mostrar el teu vídeo als altres participants.",
        },
        camDisabledByStatus: {
            title: "Càmera desactivada",
            desc: 'La teva càmera està desactivada perquè estàs en estat "{status}".',
        },
        share: {
            title: "Compartir la teva pantalla",
            desc: "Vols compartir la teva pantalla amb altres usuaris? Pots! Pots mostrar la teva pantalla a tothom al xat, i pots triar compartir tota la teva pantalla o només una finestra específica.",
        },
        apps: {
            title: "Aplicacions de tercers",
            desc: "Tens la llibertat de navegar per aplicacions externes mentre romans a la nostra aplicació, per a una experiència fluida i enriquida.",
        },
        roomList: {
            title: "Llista de sales",
            desc: "Explora la llista de sales per veure qui està present i unir-te a una conversa amb un clic.",
        },
        calendar: {
            title: "Calendari",
            desc: "Consulta les teves reunions properes i uneix-te a elles directament des de WorkAdventure.",
        },
        todolist: {
            title: "Llista de tasques",
            desc: "Gestiona les teves tasques del dia sense sortir del teu espai de treball.",
        },
        pictureInPicture: {
            title: "Imatge en imatge",
            descDisabled:
                "Malauradament, aquesta funció no està disponible al teu dispositiu ❌. Si us plau, intenta utilitzar un altre dispositiu o navegador, com Chrome o Edge, per accedir a aquesta funció.",
            desc: "Pots utilitzar la funció d'imatge en imatge per veure un vídeo o una presentació mentre estàs en una conversa. Simplement fes clic a la icona d'imatge en imatge i gaudeix del teu contingut.",
        },
    },
    listStatusTitle: {
        enable: "Canviar el teu estat",
    },
    externalModule: {
        status: {
            onLine: "L'estat està bé ✅",
            offLine: "L'estat està offline ❌",
            warning: "L'estat està en advertència ⚠️",
            sync: "L'estat està sincronitzant 🔄",
        },
    },
    featureNotAvailable: "Funció no disponible per a la teva sala 😭",
    issueReport: {
        menuAction: "Reportar un problema",
        formTitle: "Reportar un problema",
        emailLabel: "Correu electrònic (no requerit)",
        nameLabel: "Nom (no requerit)",
        descriptionLabel: "Descripció* (requerida)",
        descriptionPlaceholder: "Quin és el problema? Què esperaves?",
        submitButtonLabel: "Enviar informe d'error",
        cancelButtonLabel: "Cancel·lar",
        confirmButtonLabel: "Confirmar",
        addScreenshotButtonLabel: "Afegir una captura de pantalla",
        removeScreenshotButtonLabel: "Eliminar captura de pantalla",
        successMessageText: "Gràcies pel teu informe! El revisarem el més aviat possible.",
        highlightToolText: "Destacar",
        hideToolText: "Ocultar",
        removeHighlightText: "Eliminar",
    },
    personalDesk: {
        label: "Anar al meu escriptori",
        unclaim: "Alliberar el meu escriptori",
        errorNoUser: "No es poden trobar les vostres dades d'usuari",
        errorNotFound: "Encara no teniu un escriptori personal",
        errorMoving: "No es pot arribar al vostre escriptori personal",
        errorUnclaiming: "No es pot alliberar el vostre escriptori personal",
    },
};

export default actionbar;
