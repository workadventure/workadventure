import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

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
            interact: "Interaktion",
            follow: "Möchtest du {leader} folgen?",
        },
        stop: {
            leader: "Möchtest du nicht weiter den Weg weisen?",
            follower: "Möchtest du nicht mehr {leader} folgen?",
        },
        yes: "Ja",
        no: "Nein",
    },
    actionName: "Lokalisieren",
};

export default follow;
