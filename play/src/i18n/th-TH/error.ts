import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const error: DeepPartial<Translation["error"]> = {
    accessLink: {
        title: "ลิงก์เข้าถึงไม่ถูกต้อง",
        subTitle: "ไม่พบแผนที่ กรุณาตรวจสอบลิงก์เข้าถึงของคุณ",
        details: "หากต้องการข้อมูลเพิ่มเติม คุณสามารถติดต่อผู้ดูแลระบบ หรือติดต่อเราได้ที่: hello@workadventu.re",
    },
    connectionRejected: {
        title: "การเชื่อมต่อถูกปฏิเสธ",
        subTitle: "คุณไม่สามารถเข้าร่วมโลกนี้ได้ กรุณาลองใหม่ภายหลัง {error}",
        details: "หากต้องการข้อมูลเพิ่มเติม คุณสามารถติดต่อผู้ดูแลระบบ หรือติดต่อเราได้ที่: hello@workadventu.re",
    },
    connectionRetry: {
        unableConnect: "การเชื่อมต่อกับเซิร์ฟเวอร์ขาดหาย คุณจะไม่สามารถพูดคุยกับผู้อื่นได้",
    },
    errorDialog: {
        title: "ข้อผิดพลาด 😱",
        hasReportIssuesUrl: "หากต้องการข้อมูลเพิ่มเติม คุณสามารถติดต่อผู้ดูแลระบบ หรือรายงานปัญหาได้ที่:",
        noReportIssuesUrl: "หากต้องการข้อมูลเพิ่มเติม คุณสามารถติดต่อผู้ดูแลของโลกนี้",
        messageFAQ: "คุณยังสามารถดูได้ที่:",
        reload: "โหลดใหม่",
        close: "ปิด",
    },
};

export default error;
