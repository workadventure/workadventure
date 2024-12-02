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
            interact: "تفاعل", // Interaction
            follow: "هل ترغب في متابعة {leader}؟", // Do you want to follow {leader}?
        },
        stop: {
            leader: "هل ترغب في عدم الاستمرار في القيادة؟", // Do you not want to continue leading?
            follower: "هل ترغب في عدم متابعة {leader} بعد الآن؟", // Do you not want to follow {leader} anymore?
        },
        yes: "نعم", // Yes
        no: "لا", // No
    },
};
export default follow;
