import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const follow: DeepPartial<Translation["follow"]> = {
    interactStatus: {
        following: "Volgt {leader}",
        waitingFollowers: "Wachten op bevestiging van volgers",
        followed: {
            one: "{follower} volgt je",
            two: "{firstFollower} en {secondFollower} volgen je",
            many: "{followers} en {lastFollower} volgen je",
        },
    },
    interactMenu: {
        title: {
            follow: "Wil je {leader} volgen?",
        },
        yes: "Ja",
        no: "Nee",
    },
};

export default follow;
