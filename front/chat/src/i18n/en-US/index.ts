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
  invite: "Invite",
  roomEmpty: "This room is empty, invite a colleague or friend to join you!"
};

export default en_US;
