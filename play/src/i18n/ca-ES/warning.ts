import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const warning: DeepPartial<Translation["warning"]> = {
    title: "Atenció!",
    content: `Aquest món està apropant-se al seu límit! Podeu actualitzar la seva capacitat <a href="{upgradeLink}" target="_blank">aquí</a>`,
    limit: "Aquest món està apropant-se al seu límit!",
    accessDenied: {
        camera: "Accés a la càmera denegat. Feu clic aquí i reviseu els permissos del vostre navegador.",
        screenSharing: "Compartir pantalla denegat. Feu clic aquí i reviseu els permissos del vostre navegador.",
        room: "Accés a l'habitació denegat. No t'és permès entrar a aquesta habitació.",
        teleport: "Não está autorizado a teletransportar-se para este utilizador.",
    },
    importantMessage: "Missatge important",
    connectionLost: "Conexió perduda. Reconectant...",
    connectionLostTitle: "Conexió perduda",
    connectionLostSubtitle: "Reconectant",
    waitingConnectionTitle: "Esperant a la conexió",
    waitingConnectionSubtitle: "Conectant",
    megaphoneNeeds:
        "Per utilitzar el megàfon, has d'activar la teva càmera o el teu micròfon o compartir la teva pantalla.",
    mapEditorShortCut: "Hi ha hagut un error en intentar obrir l'editor de mapes.",
    mapEditorNotEnabled: "L'editor de mapes no està habilitat en aquest món.",
    backgroundProcessing: {
        failedToApply: "Error en aplicar els efectes de fons",
    },
    popupBlocked: {
        title: "Bloqueig de finestres emergents",
        content:
            "Si us plau, permeteu finestres emergents per a aquest lloc web en la configuració del vostre navegador.",
        done: "Ok",
    },
    duplicateUserConnected: {
        title: "Ja connectat",
        message:
            "Aquest usuari ja està connectat a aquesta sala des d'una altra pestanya o dispositiu. Per evitar conflictes, tanqueu l'altra pestanya o finestra.",
        confirmContinue: "Ho entenc, continuar",
        dontRemindAgain: "No tornar a mostrar aquest missatge",
    },
    browserNotSupported: {
        title: "😢 Navegador no compatible",
        message: "El vostre navegador ({browserName}) ja no és compatible amb WorkAdventure.",
        description:
            "El vostre navegador és massa antic per executar WorkAdventure. Si us plau, actualitzeu-lo a la darrera versió per continuar.",
        whatToDo: "Què podeu fer?",
        option1: "Actualitzar {browserName} a la darrera versió",
        option2: "Sortir de WorkAdventure i utilitzar un navegador diferent",
        updateBrowser: "Actualitzar navegador",
        leave: "Sortir",
    },
    pwaInstall: {
        title: "Instal·lar WorkAdventure",
        description:
            "Instal·leu l'aplicació per a una millor experiència: càrrega més ràpida, accés ràpid i experiència tipus aplicació.",
        descriptionIos: "Afegiu WorkAdventure a la pantalla d'inici per a una millor experiència i accés ràpid.",
        feature1Title: "Rendiment màxim",
        feature1Description: "Càrrega ultraràpida i fluida.",
        feature2Title: "Notificacions d'escriptori",
        feature2Description: "No us perdeu cap interacció.",
        feature3Title: "Experiència immersiva",
        feature3Description: "Pantalla completa, sense distraccions.",
        iosStepsTitle: "Com instal·lar",
        iosStep1: "Toqueu el botó Compartir (quadrat amb fletxa) a la part inferior de Safari.",
        iosStep2: "Desplaceu-vos cap avall i toqueu «Afegir a la pantalla d'inici».",
        iosStep3: "Toqueu «Afegir» per confirmar.",
        install: "Instal·lar l'app WorkAdventure",
        installing: "Instal·lant…",
        skip: "Continuar al navegador",
        continue: "Continuar al navegador",
        neverShowPage: "No tornar a preguntar",
    },
};

export default warning;
