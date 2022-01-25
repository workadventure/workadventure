import type { BaseTranslation } from "../i18n-types";

const follow: BaseTranslation = {
    interactStatus: {
        following: "Following {leader}",
        waitingFollowers: "Waiting for followers confirmation",
        followed: {
            one: "{follower} is following you",
            two: "{firstFollower} and {secondFollower} are following you",
            many: "{followers} and {lastFollower} are following you",
        },
    },
    interactMenu: {
        title: {
            interact: "Interaction",
            follow: "Do you want to follow {leader}?",
        },
        stop: {
            leader: "Do you want to stop leading the way?",
            follower: "Do you want to stop following {leader}?",
        },
        yes: "Yes",
        no: "No",
    },
};

export default follow;
