import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const follow: DeepPartial<Translation["follow"]> = {
    interactStatus: {
        following: "跟隨 {leader}",
        waitingFollowers: "等待跟隨者確認",
        followed: {
            one: "{follower} 正在跟隨你",
            two: "{firstFollower} 和 {secondFollower} 正在跟隨你",
            many: "{followers} 和 {lastFollower} 正在跟隨你",
        },
    },
    interactMenu: {
        title: {
            follow: "要跟隨 {leader} 嗎？",
        },
        yes: "是",
        no: "否",
    },
};

export default follow;
