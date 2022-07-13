import type { BaseTranslation } from "../i18n-types";

const en_US: BaseTranslation = {
  // TODO: your translations go here
  HI: "Hi {name:string}! Please leave a star if you like this project: https://github.com/ivanhofer/typesafe-i18n",
  users: "Users",
  userList: {
    disconnected: "Disconnected",
    isHere: "Is on thi map !",
    isOverThere: "Is on another map !",
    teleport: "Teleport",
    search: "Just look it up!",
    walkTo: "Walk to",
    teleporting: "Teleporting ...",
  },
  reconnecting: "Connection to presence server ...",
  waitingData: "Waiting user data ...",
  search: "Search for user, message, channel, etc.",
  CONNECTING: "test",
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
    enterText: "Enter a message ...",
    CONNECTING: "test",
    timeLine: {
        title: 'Your Timeline',
        open: 'Open your time line history!',
        description: 'WorkAdventure Timeline',
        incoming: ' join the discussion',
        outcoming: ' quit the discussion'
    },
    form: {
        placeholder: 'Enter your message...',
        typing: ' typing...'
    },
    notification: {
        discussion: "wants to discuss with you",
        message: "sends you a message"
    }
};

export default en_US;
