import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const follow: DeepPartial<Translation["follow"]> = {
    interactStatus: {
        following: "Slědujoš {leader}",
        waitingFollowers: "Cakanje na wobtwarźenje...",
        followed: {
            one: "{follower} slědujo śi",
            two: "{firstFollower} a {secondFollower} slědujotej śi",
            many: "{followers} a {lastFollower} slěduju śi",
        },
    },
    interactMenu: {
        title: {
            interact: "Interakcija",
            follow: "Coš slědowaś {leader}?",
        },
        stop: {
            leader: "Njocoš wěcej wjednik byś?",
            follower: "Njocoš wěcej slědowaś {leader}?",
        },
        yes: "Jo",
        no: "Ně",
    },
};

export default follow;
