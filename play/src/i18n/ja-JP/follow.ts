import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const follow: DeepPartial<Translation["follow"]> = {
    interactStatus: {
        following: "{leader} をフォローします",
        waitingFollowers: "フォロワーの確認を待っています",
        followed: {
            one: "{follower} がフォローしています",
            two: "{firstFollower} と {secondFollower} がフォローしています",
            many: "{followers} と {lastFollower} がフォローしています",
        },
    },
    interactMenu: {
        title: {
            interact: "対応",
            follow: "{leader} をフォローしますか？",
        },
        stop: {
            leader: "先導をやめますか？",
            follower: "{leader} のフォローをやめますか？",
        },
        yes: "はい",
        no: "いいえ",
    },
};

export default follow;
