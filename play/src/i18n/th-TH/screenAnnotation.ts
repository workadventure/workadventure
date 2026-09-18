import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const screenAnnotation: DeepPartial<Translation["screenAnnotation"]> = {
    startAnnotating: "ใส่คำอธิบายบนหน้าจอที่แชร์",
    stopAnnotating: "หยุดใส่คำอธิบาย",
    tools: {
        pen: "ปากกา",
        line: "เส้นตรง",
        arrow: "ลูกศร",
        rect: "สี่เหลี่ยม",
        text: "ข้อความ",
        eraser: "ยางลบ",
    },
    color: "สี",
    undo: "เลิกทำ",
    clearAll: "ล้างทั้งหมด",
    allowAnnotations: "อนุญาตให้ผู้อื่นใส่คำอธิบาย",
    disallowAnnotations: "ห้ามผู้อื่นใส่คำอธิบาย",
    textPlaceholder: "พิมพ์ข้อความ…",
};

export default screenAnnotation;
