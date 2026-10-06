import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const follow: DeepPartial<Translation["follow"]> = {
    interactStatus: {
        following: "Seguendo {leader}",
        waitingFollowers: "In attesa della conferma dei follower",
        followed: {
            one: "{follower} ti sta seguendo",
            two: "{firstFollower} e {secondFollower} ti stanno seguendo",
            many: "{followers} e {lastFollower} ti stanno seguendo",
        },
    },
    interactMenu: {
        title: {
            follow: "Vuoi seguire {leader}?",
        },
        yes: "Sì",
        no: "No",
    },
};

export default follow;
