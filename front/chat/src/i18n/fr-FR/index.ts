import type { Translation } from "../i18n-types";

const fr_FR: Translation = {
    // TODO: your translations go here
    HI: "Hallo {name}! Bitte hinterlasse einen Stern, wenn dir das Projekt gefällt: https://github.com/ivanhofer/typesafe-i18n",
    users: 'Utilisateurs',
    userList: {
        disconnected: "Non connecté",
        isHere: "Sur cette map !",
        isOverThere: "Sur une autre map !",
        teleport: "Se téléporter",
        search: "Il suffit de chercher !",
        walkTo: "Marcher jusqu'à",
        teleporting: "Téléportation ...",
    },
    reconnecting: "Connexion au serveur ...",
    waitingData: "En attentes des informations de l'utilisateur ...",
    search: "Rechercher un utilisateur, un message, un canal ...",
    userOnline: "utilisateur en ligne",
    usersOnline: "utilisateurs en ligne",
    open: "Ouvrir",
    me: "Moi",
    ban: {
        title: "Bannir",
        content: "Bannir l'utilisateur {userName} du monde courrant. Cela peut être annulé depuis l'administration.",
        ban: "Bannir cet utilisateur",
    },
    rankUp: "Promouvoir",
    rankDown: "Rétrograder",
    reinit: "Ré initialiser",
    CONNECTING: "test",
    timeLine: {
        title: 'Votre historique',
        open: 'Ouvrir votre historique de converçation !',
        description: 'Historique de vos converçations sur WorkAdventure!',
        incoming: ' a rejoint la conversation',
        outcoming: ' a quitté la conversation'
    },
    form: {
        placeholder: 'Écrire votre message...',
        typing: ' écrit...'
    }
};

export default fr_FR;
