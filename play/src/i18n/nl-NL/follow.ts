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
            interact: "Interacties",
            follow: "Wil je {leader} volgen?",
        },
        stop: {
            leader: "Wil je stoppen met de weg leiden?",
            follower: "Wil je stoppen met {leader} volgen?",
        },
        yes: "Ja",
        no: "Nee",
    },
};

export default follow;
