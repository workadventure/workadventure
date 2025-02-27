import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const follow: DeepPartial<Translation["follow"]> = {
    interactStatus: {
        following: "Siguiendo a {leader}",
        waitingFollowers: "Esperando la confirmación de los seguidores",
        followed: {
            one: "{follower} le está siguiendo",
            two: "{firstFollower} y {secondFollower} le están siguiendo",
            many: "{followers} y {lastFollower} le están siguiendo",
        },
    },
    interactMenu: {
        title: {
            interact: "Interacción",
            follow: "¿Quiere seguir a {leader}?",
        },
        stop: {
            leader: "¿Quiere dejar de liderar?",
            follower: "¿Quiere dejar de seguir a {leader}?",
        },
        yes: "Sí",
        no: "No",
    },
};

export default follow;
