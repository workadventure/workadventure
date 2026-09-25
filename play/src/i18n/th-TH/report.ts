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
        action: "จัดการ",
        reason: {
            label: "เหตุผล",
            placeholder: "ไม่บังคับ เก็บไว้ให้ผู้ดูแลของโลกนี้",
        },
        adminOnly: "สำหรับผู้ดูแลเท่านั้น",
        cancel: "ยกเลิก",
        hint: {
            block: "ไม่เห็นและไม่ได้ยินผู้ใช้นี้อีก มีผลกับคุณเท่านั้น และย้อนกลับได้",
            report: "แจ้งผู้ดูแลของโลกนี้",
            kick: "ตัดการเชื่อมต่อทันที ผู้ใช้กลับเข้ามาได้",
            ban: "ตัดการเชื่อมต่อถาวร",
        },
        kick: {
            title: "นำออกจากแผนที่",
            content: "{userName} จะถูกตัดการเชื่อมต่อทันที และกลับเข้ามาได้ในภายหลัง",
            submit: "นำออก",
        },
        ban: {
            title: "แบนจากโลกนี้",
            content: "{userName} จะถูกตัดการเชื่อมต่อ และเข้าโลกนี้ไม่ได้อีก แม้จะใช้บัญชีอื่น",
            submit: "แบน",
            confirmTitle: "แบน {userName} ถาวรหรือไม่",
            confirmContent: "ย้อนกลับจากในเกมไม่ได้ มีเพียงผู้ดูแลเท่านั้นที่ยกเลิกการแบนได้จากระบบหลังบ้าน",
        },
    },
    kicked: {
        title: "ถูกนำออก",
        subtitle: "ผู้ควบคุมนำคุณออกจากแผนที่นี้",
        details: "โหลดหน้าใหม่เพื่อเข้าร่วมอีกครั้ง",
    },
    banned: {
        title: "ถูกแบน",
        subtitle: "คุณถูกแบนจาก WorkAdventure",
        details: "หากต้องการข้อมูลเพิ่มเติม ติดต่อเราได้ที่: hello@workadventu.re",
    },
    reasonGiven: "เหตุผล: {reason}",
};

export default report;
