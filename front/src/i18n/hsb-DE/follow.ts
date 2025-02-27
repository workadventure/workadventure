import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const follow: DeepPartial<Translation["follow"]> = {
    interactStatus: {
        following: "{leader} sćěhować",
        waitingFollowers: "čakaj na wobkrućenje družliny",
        followed: {
            one: "{follower} tebi slěduje",
            two: "{firstFollower} a {secondFollower} sćěhujetaj tebi",
            many: "{followers} a {lastFollower} sćěhujetaj tebi",
        },
    },
    interactMenu: {
        title: {
            interact: "interakcija",
            follow: "Chceš {leader} sćěhować?",
        },
        stop: {
            leader: "Nochceš puć dale pokazać?",
            follower: "Nochceš wjace {leader} sćěhować?",
        },
        yes: "haj",
        no: "ně",
    },
};

export default follow;
