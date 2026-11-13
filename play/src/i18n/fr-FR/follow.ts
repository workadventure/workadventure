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
            follow: "Voulez-vous suivre {leader} ?",
        },
        yes: "Oui",
        no: "Non",
    },
};

export default follow;
