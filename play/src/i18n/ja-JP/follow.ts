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
            follow: "{leader} をフォローしますか？",
        },
        yes: "はい",
        no: "いいえ",
    },
};

export default follow;
