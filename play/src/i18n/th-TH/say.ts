import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const say: DeepPartial<Translation["say"]> = {
    type: {
        say: "พูด",
        think: "คิด",
    },
    placeholder: "พิมพ์ข้อความของคุณที่นี่...",
    button: "สร้างบับเบิล",
    tooltip: {
        description: {
            say: "แสดงบับเบิลข้อความเหนือตัวละครของคุณ ทุกคนบนแผนที่มองเห็นได้ และจะแสดงอยู่ 5 วินาที",
            think: "แสดงบับเบิลความคิดเหนือตัวละครของคุณ ผู้เล่นทุกคนบนแผนที่มองเห็นได้ และจะแสดงอยู่ตราบเท่าที่คุณไม่ขยับ",
        },
    },
};

export default say;
