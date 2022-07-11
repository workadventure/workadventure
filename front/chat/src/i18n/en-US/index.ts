import type { BaseTranslation } from "../i18n-types";

const en_US: BaseTranslation = {
    // TODO: your translations go here
    HI: "Hi {name:string}! Please leave a star if you like this project: https://github.com/ivanhofer/typesafe-i18n",
    users: 'Users',
    userList: {
        disconnected: "Disconnected",
        isHere: "Is on this map !",
        isOverThere: "Is on an another map !",
        teleport: "Teleport",
        search: "Just look it up!",
        walkTo: "Walk to",
        teleporting: "Teleporting ...",
    },
    reconnecting: "Connection to presence server ...",
    waitingData: "Waiting user data ...",
    search: "Search for user, message, channel, etc.",
    userOnline: "user online",
    usersOnline: "users online",
    open: "Open",
    me: "Me",
    ban: {
        title: "Banish",
        content: "Ban user {userName} from the running world. This can be cancelled from the administration.",
        ban: "Ban this user",
    },
    rankUp: "Promote",
    rankDown: "Retrograde",
    reinit: "Re initialize",
    "enterText": "Enter a message ...",
    CONNECTING: "test"
};

export default en_US;
