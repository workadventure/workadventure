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
            follow: "Você quer seguir {leader}?",
        },
        yes: "Sim",
        no: "Não",
    },
};

export default follow;
