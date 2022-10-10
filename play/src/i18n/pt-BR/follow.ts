import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const follow: DeepPartial<Translation["follow"]> = {
    interactStatus: {
        following: "Seguindo {leader}",
        waitingFollowers: "Aguardando confirmação dos seguidores",
        followed: {
            one: "{follower} está seguindo você",
            two: "{firstFollower} e {secondFollower} estão seguindo você",
            many: "{followers} e {lastFollower} estão seguindo você",
        },
    },
    interactMenu: {
        title: {
            interact: "Interação",
            follow: "Você quer seguir {leader}?",
        },
        stop: {
            leader: "Você quer parar de liderar o caminho?",
            follower: "Você quer parar de seguir {leader}?",
        },
        yes: "Sim",
        no: "Não",
    },
};

export default follow;
