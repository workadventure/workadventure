import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "ปัญหาการเชื่อมต่อเครือข่าย",
    no_video_stream_received: "ไม่ได้รับสตรีมวิดีโอ",
    user_is_muted: "{name} ถูกปิดเสียงอยู่",
    reduce: "ย่อ",
    connecting: "กำลังเชื่อมต่อ...",
    reconnecting: "กำลังเชื่อมต่อใหม่...",
    persistent_connection_issue: "กำลังเชื่อมต่อใหม่... การเชื่อมต่อไม่เสถียร...",
    click_and_drag_to_resize: "คลิกแล้วลากเพื่อปรับขนาด",
    click_to_unblock: "คลิกเพื่อเลิกบล็อก",
    away: {
        subtitle: "หยุดชั่วคราวขณะที่คุณไม่อยู่",
        cantSeeOrHear: "ไม่มีใครเห็นหรือได้ยินคุณ",
        heardNotSeen: "ได้ยินคุณ แต่ไม่เห็นคุณ",
        cantSee: "ไม่มีใครเห็นคุณ",
        seenNotHeard: "เห็นคุณ แต่ไม่ได้ยินคุณ",
        cantHear: "ไม่มีใครได้ยินคุณ",
        turnOnBoth: "เปิดกล้องและไมค์",
        turnOnCamera: "เปิดกล้อง",
        turnOnMicrophone: "เปิดไมค์",
        turnOn: "เปิด",
    },
};

export default video;
