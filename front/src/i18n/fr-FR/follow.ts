import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const follow: DeepPartial<Translation["follow"]> = {
    interactStatus: {
        following: "Vous suivez {leader}",
        waitingFollowers: "En attente de la confirmation des suiveurs",
        followed: {
            one: "{follower} vous suit",
            two: "{firstFollower} et {secondFollower} vous suivent",
            many: "{followers} et {lastFollower} vous suivent",
        },
    },
    interactMenu: {
        title: {
            interact: "Interaction",
            follow: "Voulez-vous suivre {leader}?",
        },
        stop: {
            leader: "Voulez-vous qu'on arrête de vous suivre?",
            follower: "Voulez-vous arrêter de suivre {leader}?",
        },
        yes: "Oui",
        no: "Non",
    },
};

export default follow;
