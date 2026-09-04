import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "ยอมรับ",
    close: "ปิด",
    confirm: "ยืนยัน",
    goBackToOnlineStatusLabel: "คุณต้องการกลับมาออนไลน์หรือไม่?",
    allowNotification: "อนุญาตการแจ้งเตือนหรือไม่?",
    allowNotificationExplanation: "รับการแจ้งเตือนบนเดสก์ท็อปเมื่อมีคนต้องการพูดคุยกับคุณ",
    audioPlaybackBlocked: "เบราว์เซอร์ของคุณบล็อกการเล่นเสียง",
    audioPlaybackInterrupted: "การเล่นเสียงถูกขัดจังหวะโดยเบราว์เซอร์หรือระบบปฏิบัติการของคุณ",
    turnSoundOn: "เปิดเสียง",
};

export default statusModal;
