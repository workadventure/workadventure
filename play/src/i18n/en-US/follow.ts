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
            follow: "Do you want to follow {leader}?",
        },
        yes: "Yes",
        no: "No",
    },
};

export default follow;
