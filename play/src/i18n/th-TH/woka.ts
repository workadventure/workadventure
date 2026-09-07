import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "สร้าง WOKA ของคุณ",
        navigation: {
            finish: "เสร็จสิ้น",
            backToDefaultWoka: "กลับไปใช้ WOKA เริ่มต้น",
        },
        randomize: "สุ่ม",
    },
    selectWoka: {
        title: "เลือก WOKA ของคุณ",
        continue: "ดำเนินการต่อ",
        customize: "สร้าง WOKA ของคุณ",
        randomize: "เลือกแบบสุ่ม",
    },
    menu: {
        businessCard: "นามบัตร",
    },
};

export default woka;
