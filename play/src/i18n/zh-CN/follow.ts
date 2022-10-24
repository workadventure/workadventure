import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const follow: DeepPartial<Translation["follow"]> = {
    interactStatus: {
        following: "跟随 {leader}",
        waitingFollowers: "等待跟随者确认",
        followed: {
            one: "{follower} 正在跟随你",
            two: "{firstFollower} 和 {secondFollower} 正在跟随你",
            many: "{followers} 和 {lastFollower} 正在跟随你",
        },
    },
    interactMenu: {
        title: {
            interact: "交互",
            follow: "要跟随 {leader} 吗？",
        },
        stop: {
            leader: "要停止领路吗?",
            follower: "要停止跟随 {leader} 吗？",
        },
        yes: "是",
        no: "否",
    },
};

export default follow;
