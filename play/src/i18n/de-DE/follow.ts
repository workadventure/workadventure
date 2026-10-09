import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const follow: DeepPartial<Translation["follow"]> = {
    interactStatus: {
        following: "{leader} folgen",
        waitingFollowers: "Warten auf Bestätigung...",
        followed: {
            one: "{follower} folgt dir",
            two: "{firstFollower} und {secondFollower} folgen dir",
            many: "{followers} und {lastFollower} folgen dir",
        },
    },
    interactMenu: {
        title: {
            follow: "Möchtest du {leader} folgen?",
        },
        yes: "Ja",
        no: "Nein",
    },
};

export default follow;
