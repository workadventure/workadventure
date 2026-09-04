import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} ต้องการพูดคุยกับคุณ",
    message: "{name} ส่งข้อความ",
    chatRoom: "ในห้องแชท",
    askToMuteMicrophone: "ขอปิดเสียงไมโครโฟนของคุณได้ไหม?",
    askToMuteCamera: "ขอปิดกล้องของคุณได้ไหม?",
    microphoneMuted: "ไมโครโฟนของคุณถูกปิดเสียงโดยผู้ควบคุม",
    cameraMuted: "กล้องของคุณถูกปิดโดยผู้ควบคุม",
    notificationSentToMuteMicrophone: "ส่งการแจ้งเตือนถึง {name} เพื่อขอให้ปิดไมโครโฟนแล้ว",
    notificationSentToMuteCamera: "ส่งการแจ้งเตือนถึง {name} เพื่อขอให้ปิดกล้องแล้ว",
    announcement: "ประกาศ",
    open: "เปิด",
    help: {
        title: "การเข้าถึงการแจ้งเตือนถูกปฏิเสธ",
        permissionDenied: "ไม่ได้รับอนุญาต",
        content:
            "ไม่พลาดทุกการสนทนา เปิดการแจ้งเตือนเพื่อรับแจ้งเมื่อมีคนต้องการพูดคุยกับคุณ แม้คุณจะไม่ได้อยู่ที่แท็บ WorkAdventure",
        firefoxContent: 'กรุณาทำเครื่องหมายที่ช่อง "Remember this decision" หากไม่ต้องการให้ Firefox ถามสิทธิ์ซ้ำอีก',
        refresh: "รีเฟรช",
        continue: "ดำเนินการต่อโดยไม่รับการแจ้งเตือน",
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
    addNewTag: "เพิ่มแท็กใหม่: '{tag}'",
    screenSharingError: "ไม่สามารถเริ่มแชร์หน้าจอได้",
    recordingStarted: "มีผู้เข้าร่วมคนหนึ่งเริ่มบันทึกการสนทนา",
    urlCopiedToClipboard: "คัดลอก URL ไปยังคลิปบอร์ดแล้ว",
};

export default notification;
