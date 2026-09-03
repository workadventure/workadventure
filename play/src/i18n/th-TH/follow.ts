import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const follow: DeepPartial<Translation["follow"]> = {
    interactStatus: {
        following: "กำลังติดตาม {leader}",
        waitingFollowers: "กำลังรอการยืนยันจากผู้ติดตาม",
        followed: {
            one: "{follower} กำลังติดตามคุณ",
            two: "{firstFollower} และ {secondFollower} กำลังติดตามคุณ",
            many: "{followers} และ {lastFollower} กำลังติดตามคุณ",
        },
    },
    interactMenu: {
        title: {
            interact: "การโต้ตอบ",
            follow: "คุณต้องการติดตาม {leader} หรือไม่?",
        },
        stop: {
            leader: "คุณต้องการหยุดนำทางหรือไม่?",
            follower: "คุณต้องการหยุดติดตาม {leader} หรือไม่?",
        },
        yes: "ใช่",
        no: "ไม่",
    },
    actionName: "ค้นหาตำแหน่ง",
};

export default follow;
