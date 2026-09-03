import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const warning: DeepPartial<Translation["warning"]> = {
    title: "คำเตือน!",
    content: `โลกนี้ใกล้ถึงขีดจำกัดแล้ว! คุณสามารถอัปเกรดความจุได้<a href="{upgradeLink}" target="_blank">ที่นี่</a>`,
    limit: "โลกนี้ใกล้ถึงขีดจำกัดแล้ว!",
    accessDenied: {
        camera: "การเข้าถึงกล้องถูกปฏิเสธ คลิกที่นี่และตรวจสอบสิทธิ์ในเบราว์เซอร์ของคุณ",
        screenSharing: "การแชร์หน้าจอถูกปฏิเสธ คลิกที่นี่และตรวจสอบสิทธิ์ในเบราว์เซอร์ของคุณ",
        teleport: "คุณไม่มีสิทธิ์เทเลพอร์ตไปหาผู้ใช้นี้",
        room: "การเข้าถึงห้องถูกปฏิเสธ คุณไม่ได้รับอนุญาตให้เข้าห้องนี้",
    },
    importantMessage: "ข้อความสำคัญ",
    connectionLost: "การเชื่อมต่อขาดหาย กำลังเชื่อมต่อใหม่...",
    connectionLostTitle: "การเชื่อมต่อขาดหาย",
    connectionLostSubtitle: "กำลังเชื่อมต่อใหม่",
    waitingConnectionTitle: "กำลังรอการเชื่อมต่อ",
    waitingConnectionSubtitle: "กำลังเชื่อมต่อ",
    megaphoneNeeds: "หากต้องการใช้เมกะโฟน คุณต้องเปิดกล้อง เปิดไมโครโฟน หรือแชร์หน้าจอ",
    mapEditorShortCut: "เกิดข้อผิดพลาดขณะพยายามเปิดตัวแก้ไขแผนที่",
    mapEditorNotEnabled: "ตัวแก้ไขแผนที่ไม่ได้เปิดใช้งานในโลกนี้",
    popupBlocked: {
        title: "ป็อปอัปถูกบล็อก",
        content: "กรุณาอนุญาตป็อปอัปสำหรับเว็บไซต์นี้ในการตั้งค่าเบราว์เซอร์ของคุณ",
        done: "ตกลง",
    },
    backgroundProcessing: {
        failedToApply: "ไม่สามารถใช้เอฟเฟกต์พื้นหลังได้",
    },
    duplicateUserConnected: {
        title: "เชื่อมต่ออยู่แล้ว",
        message:
            "คุณเชื่อมต่อกับห้องนี้อยู่แล้วจากแท็บหรืออุปกรณ์อื่น เพื่อหลีกเลี่ยงข้อขัดแย้ง กรุณาปิดแท็บหรือหน้าต่างอื่นนั้น",
        confirmContinue: "เข้าใจแล้ว ดำเนินการต่อ",
        dontRemindAgain: "ไม่ต้องแสดงข้อความนี้อีก",
    },
    browserNotSupported: {
        title: "😢 เบราว์เซอร์ไม่รองรับ",
        message: "เบราว์เซอร์ของคุณ ({browserName}) ไม่ได้รับการรองรับจาก WorkAdventure อีกต่อไป",
        description:
            "เบราว์เซอร์ของคุณเก่าเกินกว่าจะใช้งาน WorkAdventure ได้ กรุณาอัปเดตเป็นเวอร์ชันล่าสุดเพื่อดำเนินการต่อ",
        whatToDo: "คุณทำอะไรได้บ้าง?",
        option1: "อัปเดต {browserName} เป็นเวอร์ชันล่าสุด",
        option2: "ออกจาก WorkAdventure และใช้เบราว์เซอร์อื่น",
        updateBrowser: "อัปเดตเบราว์เซอร์",
        leave: "ออก",
    },
    pwaInstall: {
        title: "ติดตั้ง WorkAdventure",
        description: "ติดตั้งแอปเพื่อประสบการณ์ที่ดียิ่งขึ้น: เข้าถึงได้รวดเร็ว เปิดพร้อมเครื่อง และใช้งานเหมือนแอป",
        descriptionIos: "เพิ่ม WorkAdventure ลงในหน้าจอโฮมของคุณเพื่อประสบการณ์ที่ดีขึ้นและการเข้าถึงที่รวดเร็ว",
        feature1Title: "เข้าถึงรวดเร็ว",
        feature1Description: "เปิด WorkAdventure จากเมนู Start, Dock หรือเดสก์ท็อปของคุณ",
        feature2Title: "หน้าต่างแอปโดยเฉพาะ",
        feature2Description: "แยก WorkAdventure ออกจากแท็บเบราว์เซอร์ และเห็น WorkAdventure ได้ทันทีในทาสก์บาร์ของคุณ",
        feature3Title: "เริ่มพร้อมคอมพิวเตอร์ของคุณ",
        feature3Description: "เปิด WorkAdventure เมื่ออุปกรณ์ของคุณเริ่มทำงาน",
        iosStepsTitle: "วิธีติดตั้ง",
        iosStep1: "แตะปุ่มแชร์ (สี่เหลี่ยมพร้อมลูกศร) ที่ด้านล่างของ Safari",
        iosStep2: 'เลื่อนลงแล้วแตะ "เพิ่มลงในหน้าจอโฮม"',
        iosStep3: 'แตะ "เพิ่ม" เพื่อยืนยัน',
        install: "ติดตั้งแอป WorkAdventure",
        installing: "กำลังติดตั้ง…",
        skip: "ใช้งานต่อในเบราว์เซอร์",
        continue: "ใช้งานต่อในเบราว์เซอร์",
        neverShowPage: "ไม่ต้องถามอีก",
    },
};

export default warning;
