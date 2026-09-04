import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const follow: DeepPartial<Translation["follow"]> = {
    interactStatus: {
        following: "Đang đi theo {leader}",
        waitingFollowers: "Đang chờ xác nhận từ những người đi theo",
        followed: {
            one: "{follower} đang đi theo bạn",
            two: "{firstFollower} và {secondFollower} đang đi theo bạn",
            many: "{followers} và {lastFollower} đang đi theo bạn",
        },
    },
    interactMenu: {
        title: {
            interact: "Tương tác",
            follow: "Bạn có muốn đi theo {leader} không?",
        },
        stop: {
            leader: "Bạn có muốn ngừng dẫn đường không?",
            follower: "Bạn có muốn ngừng đi theo {leader} không?",
        },
        yes: "Có",
        no: "Không",
    },
    actionName: "Định vị",
};

export default follow;
