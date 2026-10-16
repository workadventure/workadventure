import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const follow: DeepPartial<Translation["follow"]> = {
    interactStatus: {
        following: "يتبع {leader}", // following {leader}
        waitingFollowers: "في انتظار التأكيد...", // Waiting for confirmation...
        followed: {
            one: "{follower} يتبعك", // {follower} is following you
            two: "{firstFollower} و {secondFollower} يتبعانك", // {firstFollower} and {secondFollower} are following you
            many: "{followers} و {lastFollower} يتبعونك", // {followers} and {lastFollower} are following you
        },
    },
    interactMenu: {
        title: {
            follow: "هل ترغب في متابعة {leader}؟", // Do you want to follow {leader}?
        },
        yes: "نعم", // Yes
        no: "لا", // No
    },
};
export default follow;
