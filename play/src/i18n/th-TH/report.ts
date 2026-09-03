import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "บล็อก",
        content: "บล็อกการสื่อสารทั้งหมดจากและถึง {userName} สามารถยกเลิกได้ภายหลัง",
        unblock: "เลิกบล็อกผู้ใช้นี้",
        block: "บล็อกผู้ใช้นี้",
    },
    title: "รายงาน",
    content: "ส่งข้อความรายงานถึงผู้ดูแลของห้องนี้ ผู้ดูแลอาจแบนผู้ใช้นี้ในภายหลัง",
    message: {
        title: "ข้อความของคุณ: ",
        empty: "ข้อความรายงานต้องไม่ว่างเปล่า",
        error: "เกิดข้อผิดพลาดในการส่งรายงาน คุณสามารถติดต่อผู้ดูแลระบบได้",
    },
    submit: "รายงานผู้ใช้นี้",
    moderate: {
        title: "จัดการ {userName}",
        block: "บล็อก",
        report: "รายงาน",
        noSelect: "ข้อผิดพลาด: ยังไม่ได้เลือกการดำเนินการ",
    },
};

export default report;
