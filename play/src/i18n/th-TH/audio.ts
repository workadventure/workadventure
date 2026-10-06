import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    volumeCtrl: "ปรับระดับเสียง",
    manager: {
        reduce: "ลดระดับเสียงของเครื่องเล่นเสียงขณะพูด",
        allow: "อนุญาตให้เล่นเสียง",
        error: "ไม่สามารถโหลดเสียงได้",
        notAllowed: "▶️ ยังไม่ได้รับอนุญาตให้เล่นเสียง กด [SPACE] หรือคลิกที่นี่เพื่อเล่น!",
    },
    message: "ข้อความเสียง",
    disable: "ปิดไมโครโฟนของคุณ",
};

export default audio;
