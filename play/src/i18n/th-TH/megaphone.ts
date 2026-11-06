import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    announcement: {
        title: "ส่งประกาศ",
        audience: "ใครจะได้รับ?",
        thisRoom: "ห้องนี้",
        wholeWorld: "ทั้งโลก",
        place: "สถานที่ที่จะไป (ไม่บังคับ)",
        noPlace: "ไม่มีสถานที่",
        noPlaceOnMap: "แผนที่นี้ยังไม่มีพื้นที่ที่ตั้งชื่อไว้",
        preview: "ตัวอย่าง",
        sendToRoom: "ส่งถึงห้องนี้",
        sendToWorld: "ส่งถึงทั้งโลก",
        confirmWorld: "ทุกห้องในโลกจะได้รับประกาศนี้",
        confirmSend: "ใช่ ส่งถึงทั้งโลก",
        cancel: "ยกเลิก",
        sentToRoom: "ส่งประกาศถึงห้องนี้แล้ว",
        sentToWorld: "ส่งประกาศถึงทั้งโลกแล้ว",
        join: "ไปที่ {place}",
        joinMap: "ไป",
        placeNotFound: "สถานที่นี้ไม่มีอยู่บนแผนที่แล้ว",
        admin: "ผู้ดูแลระบบ",
        more: "ประกาศที่รออยู่: {count}",
    },
    modal: {
        liveMessage: {
            startMegaphone: "เริ่มใช้เมกะโฟน",
            stopMegaphone: "หยุดใช้เมกะโฟน",
            goingToStream: "คุณกำลังจะถ่ายทอด",
            yourMicrophone: "ไมโครโฟนของคุณ",
            yourCamera: "กล้องของคุณ",
            yourScreen: "หน้าจอของคุณ",
            title: "เมกะโฟน",
            and: "และ",
            toAll: "ถึงผู้เข้าร่วมทุกคน",
            settings: "การตั้งค่า",
        },
    },
};

export default megaphone;
