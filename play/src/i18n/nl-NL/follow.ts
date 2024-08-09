import type { BaseTranslation } from "../i18n-types";

const follow: BaseTranslation = {
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
