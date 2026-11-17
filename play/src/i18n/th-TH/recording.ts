import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "รีเฟรช",
    title: "รายการบันทึกของคุณ",
    noRecordings: "ไม่พบรายการบันทึก",
    errorFetchingRecordings: "เกิดข้อผิดพลาดขณะดึงรายการบันทึก",
    expireIn: "หมดอายุในอีก {days} วัน{s}",
    expiresOn: "หมดอายุวันที่ {date}",
    download: "ดาวน์โหลด",
    close: "ปิด",
    recordingList: "รายการบันทึก",
    viewList: "มุมมองรายการ",
    viewCards: "มุมมองการ์ด",
    back: "กลับ",
    actions: "การดำเนินการ",
    contextMenu: {
        openInNewTab: "เปิดในแท็บใหม่",
        delete: "ลบ",
    },
    notification: {
        deleteNotification: "ลบการบันทึกเรียบร้อยแล้ว",
        deleteFailedNotification: "ไม่สามารถลบการบันทึกได้",
        startFailedNotification: "ไม่สามารถเริ่มการบันทึกได้",
        stopFailedNotification: "ไม่สามารถหยุดการบันทึกได้",
        recordingStarted: "{name} ได้เริ่มการบันทึก",
        downloadFailedNotification: "ไม่สามารถดาวน์โหลดการบันทึกได้",
        recordingComplete: "การบันทึกเสร็จสมบูรณ์",
        recordingIsInProgress: "กำลังบันทึกอยู่",
        unexpectedlyStoppedNotification: "การบันทึกหยุดลงโดยไม่คาดคิด",
        recordingSaved: "บันทึกของคุณถูกจัดเก็บเรียบร้อยแล้ว",
        howToAccess: "วิธีเข้าถึงรายการบันทึกของคุณ:",
        viewRecordings: "ดูรายการบันทึก",
    },
    actionbar: {
        title: {
            start: "เริ่มบันทึก",
            stop: "หยุดบันทึก",
            inProgress: "กำลังบันทึกอยู่",
        },
        desc: {
            needLogin: "คุณต้องเข้าสู่ระบบเพื่อบันทึก",
            advert: "ผู้เข้าร่วมทุกคนจะได้รับแจ้งว่าคุณกำลังเริ่มการบันทึก",
            yourRecordInProgress: "กำลังบันทึกอยู่ คลิกเพื่อหยุด",
            inProgress: "กำลังบันทึกอยู่",
        },
        spacePicker: {
            title: "บันทึก",
            source: "สิ่งที่จะบันทึก",
            savedHint: "บันทึกไว้ในรายการบันทึกของคุณเมื่อหยุด",
            megaphone: "บันทึกเมกะโฟน",
            discussion: "บันทึกการสนทนา",
            withMap: "เลย์เอาต์ของวิดีโอ:",
            camerasOnly: "กล้องเท่านั้น",
            camerasOnlyHint:
                "เฉพาะกล้อง ไม่มีแผนที่ วิดีโอนี้ควบคุมระหว่างบันทึกไม่ได้: ไม่มีแผงโปรดิวเซอร์ และเปลี่ยนเลย์เอาต์หรือการซูมไม่ได้",
            layout: {
                map: "เน้นแผนที่",
                balanced: "สมดุล",
                cameras: "เน้นกล้อง",
            },
        },
        producer: {
            preview: "ในวิดีโอตอนนี้",
            layout: "เลย์เอาต์",
            zoom: "ซูม",
            zoomLevel: {
                tight: "ใกล้",
                wide: "ซูมออก",
                whole: "ทั้งแผนที่",
            },
            framing: "การจัดเฟรม",
            follow: "ติดตามบับเบิล",
            frameMyView: "จัดเฟรมตามที่ฉันเห็น",
            cameras: "กล้อง",
            pin: "ปักหมุด",
            unpin: "เลิกปักหมุด",
            pinHint: "คนที่ปักหมุดไว้จะยังมีช่องของตัวเองแม้ไม่ได้พูด (สูงสุด {max})",
        },
    },
};

export default recording;
