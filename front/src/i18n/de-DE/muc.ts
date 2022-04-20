import { Translation } from "../i18n-types";

const muc: NonNullable<Translation["muc"]> = {
    title: "Users list",
    userList: {
        isHere: "Is here!",
        teleport: "Teleport",
        search: "Just look it up!",
    },
    mucRoom: {
        reconnecting: "Connection to presence server in progress",
    },
};

export default muc;
