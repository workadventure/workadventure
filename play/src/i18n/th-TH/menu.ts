import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    title: "เมนู",
    icon: {
        open: {
            menu: "เปิดเมนู",
            invite: "แสดงคำเชิญ",
            register: "ลงทะเบียน",
            chat: "เปิดแชท",
            userlist: "รายชื่อผู้ใช้",
            openEmoji: "เปิดป็อปอัปเลือกอีโมจิ",
            closeEmoji: "ปิดเมนูอีโมจิ",
            mobile: "เปิดเมนูมือถือ",
            calendar: "ปฏิทิน",
            todoList: "รายการสิ่งที่ต้องทำ",
        },
    },
    visitCard: {
        close: "ปิด",
        sendMessage: "ส่งข้อความ",
    },
    profile: {
        login: "เข้าสู่ระบบ",
        logout: "ออกจากระบบ",
        helpAndTips: "ความช่วยเหลือและเคล็ดลับ",
    },
    settings: {
        videoBandwidth: {
            title: "คุณภาพวิดีโอ",
            low: "ต่ำ",
            recommended: "แนะนำ",
            high: "สูง",
        },
        shareScreenBandwidth: {
            title: "คุณภาพการแชร์หน้าจอ",
            low: "ต่ำ",
            recommended: "แนะนำ",
            high: "สูง",
        },
        bandwidthConstrainedPreference: {
            title: "เมื่อแบนด์วิดท์เครือข่ายจำกัด",
            maintainFramerateTitle: "รักษาความลื่นไหลของภาพเคลื่อนไหว",
            maintainFramerateDescription:
                "ให้ความสำคัญกับอัตราเฟรมมากกว่าความละเอียด ใช้เมื่อความลื่นไหลของภาพสำคัญ เช่น การสตรีมวิดีโอเกม",
            maintainResolutionTitle: "รักษาความคมชัดของตัวอักษร",
            maintainResolutionDescription:
                "ให้ความสำคัญกับความละเอียดมากกว่าอัตราเฟรม ใช้เมื่อความชัดเจนของตัวอักษรสำคัญ เช่น การนำเสนอ หรือการแชร์โค้ด",
            balancedTitle: "รักษาสมดุลระหว่างอัตราเฟรมและความละเอียด",
            balancedDescription: "พยายามรักษาสมดุลระหว่างอัตราเฟรมและความละเอียด",
        },
        microphone: {
            title: "การตั้งค่าไมโครโฟน",
            autoGainControl: "ปรับระดับเสียงอัตโนมัติ",
            autoGainControlDescription: "ปรับระดับเสียงไมโครโฟนของคุณโดยอัตโนมัติ",
            echoCancellation: "ตัดเสียงสะท้อน",
            enableAdvancedNoiseReduction: "เปิดใช้การลดเสียงรบกวนขั้นสูง",
            noiseSuppressionMode: "โหมดตัดเสียงรบกวน:",
            workAdventureNoiseSuppression: "การตัดเสียงรบกวนของ WorkAdventure",
            workAdventureNoiseSuppressionDescription: "ประมวลผลไมโครโฟนของคุณด้วยระบบตัดเสียงรบกวนของ WorkAdventure",
            recommended: "แนะนำ",
            browserNoiseSuppression: "การตัดเสียงรบกวนของเบราว์เซอร์",
            browserNoiseSuppressionDescription: "ใช้ระบบตัดเสียงรบกวนในตัวของเบราว์เซอร์",
            voiceIsolation: "แยกเสียงพูด",
            voiceIsolationDescription: "ใช้ระบบแยกเสียงพูดของเบราว์เซอร์และระบบปฏิบัติการเมื่อรองรับ",
        },
        language: {
            title: "ภาษา",
        },
        privacySettings: {
            title: "โหมดไม่อยู่",
            explanation:
                'เมื่อแท็บ WorkAdventure ในเบราว์เซอร์ของคุณไม่ได้แสดงอยู่ WorkAdventure จะสลับเป็น "โหมดไม่อยู่"',
            cameraToggle: 'เปิดกล้องต่อไปใน "โหมดไม่อยู่"',
            microphoneToggle: 'เปิดไมโครโฟนต่อไปใน "โหมดไม่อยู่"',
        },
        save: "บันทึก",
        otherSettings: "การตั้งค่าทั้งหมด",
        fullscreen: "เต็มหน้าจอ",
        notifications: "การแจ้งเตือน",
        enablePictureInPicture: "เปิดใช้ภาพซ้อนภาพ",
        chatSounds: "เสียงแชท",
        cowebsiteTrigger: "ถามทุกครั้งก่อนเปิดเว็บไซต์และห้อง Jitsi Meet",
        ignoreFollowRequest: "ไม่รับคำขอติดตามจากผู้ใช้คนอื่น",
        proximityDiscussionVolume: "ระดับเสียงการสนทนาระยะใกล้",
        blockAudio: "บล็อกเสียงแวดล้อมและเพลง",
        disableAnimations: "ปิดแอนิเมชันของแผนที่",
        bubbleSound: "เสียงบับเบิล",
        bubbleSoundOptions: {
            ding: "ติ๊ง",
            wobble: "ว้อบเบิล",
        },
        displayVideoQualityStats: "แสดงสถิติคุณภาพวิดีโอ",
    },
    invite: {
        description: "แชร์ลิงก์ของห้องนี้!",
        copy: "คัดลอก",
        copied: "คัดลอกแล้ว",
        share: "แชร์",
        walkAutomaticallyToPosition: "เดินมายังตำแหน่งของฉันโดยอัตโนมัติ",
        selectEntryPoint: "ใช้จุดเข้าอื่น",
        selectEntryPointSelect: "เลือกจุดเข้าที่ผู้ใช้จะมาถึง",
    },
    globalMessage: {
        text: "ข้อความ",
        audio: "เสียง",
        warning: "กระจายไปยังทุกห้องของโลกนี้",
        enter: "พิมพ์ข้อความของคุณที่นี่...",
        send: "ส่ง",
    },
    globalAudio: {
        uploadInfo: "อัปโหลดไฟล์",
        error: "ยังไม่ได้เลือกไฟล์ คุณต้องอัปโหลดไฟล์ก่อนส่ง",
        errorUpload:
            "เกิดข้อผิดพลาดในการอัปโหลดไฟล์ กรุณาตรวจสอบไฟล์แล้วลองใหม่อีกครั้ง หากปัญหายังคงอยู่ กรุณาติดต่อผู้ดูแลระบบ",
        dragAndDrop: "ลากแล้ววาง หรือคลิกที่นี่เพื่ออัปโหลดไฟล์ของคุณ 🎧",
    },
    contact: {
        gettingStarted: {
            title: "เริ่มต้นใช้งาน",
            description:
                "WorkAdventure ช่วยให้คุณสร้างพื้นที่ออนไลน์เพื่อสื่อสารกับผู้อื่นได้อย่างเป็นธรรมชาติ และทุกอย่างเริ่มต้นจากการสร้างพื้นที่ของคุณเอง เลือกจากแผนที่สำเร็จรูปมากมายที่ทีมของเราจัดทำไว้",
        },
        createMap: {
            title: "สร้างแผนที่ของคุณ",
            description: "คุณยังสามารถสร้างแผนที่ของคุณเองได้โดยทำตามขั้นตอนในเอกสารประกอบ",
        },
    },
    about: {
        mapInfo: "ข้อมูลเกี่ยวกับแผนที่",
        mapLink: "ลิงก์ไปยังแผนที่นี้",
        copyrights: {
            map: {
                title: "ลิขสิทธิ์ของแผนที่",
                empty: "ผู้สร้างแผนที่ไม่ได้ระบุลิขสิทธิ์ของแผนที่",
            },
            tileset: {
                title: "ลิขสิทธิ์ของไทล์เซ็ต",
                empty: "ผู้สร้างแผนที่ไม่ได้ระบุลิขสิทธิ์ของไทล์เซ็ต ซึ่งไม่ได้หมายความว่าไทล์เซ็ตเหล่านั้นไม่มีสัญญาอนุญาต",
            },
            audio: {
                title: "ลิขสิทธิ์ของไฟล์เสียง",
                empty: "ผู้สร้างแผนที่ไม่ได้ระบุลิขสิทธิ์ของไฟล์เสียง ซึ่งไม่ได้หมายความว่าไฟล์เสียงเหล่านั้นไม่มีสัญญาอนุญาต",
            },
        },
    },
    chat: {
        matrixIDLabel: "Matrix ID ของคุณ",
        settings: "การตั้งค่า",
        resetKeyStorageUpButtonLabel: "รีเซ็ตที่เก็บกุญแจของคุณ",
        resetKeyStorageConfirmationModal: {
            title: "ยืนยันการรีเซ็ตที่เก็บกุญแจ",
            content: "คุณกำลังจะรีเซ็ตที่เก็บกุญแจ แน่ใจหรือไม่?",
            warning:
                "การรีเซ็ตที่เก็บกุญแจจะลบเซสชันปัจจุบันและผู้ใช้ที่เชื่อถือได้ทั้งหมดของคุณ คุณอาจสูญเสียการเข้าถึงข้อความเก่าบางส่วน และจะไม่ได้รับการยอมรับเป็นผู้ใช้ที่เชื่อถือได้อีกต่อไป กรุณาทำความเข้าใจผลของการกระทำนี้ให้ดีก่อนดำเนินการ",
            cancel: "ยกเลิก",
            continue: "ดำเนินการต่อ",
        },
    },
    sub: {
        profile: "โปรไฟล์",
        settings: "การตั้งค่า",
        credit: "เครดิต",
        globalMessages: "ข้อความทั่วถึง",
        contact: "ติดต่อ",
        report: "รายงานปัญหา",
        chat: "แชท",
        help: "ความช่วยเหลือและบทแนะนำ",
        contextualActions: "การดำเนินการตามบริบท",
        shortcuts: "ปุ่มลัด",
    },
    shortcuts: {
        title: "ปุ่มลัดคีย์บอร์ด",
        keys: "ปุ่มลัด",
        actions: "การดำเนินการ",
        moveUp: "เดินขึ้น",
        moveDown: "เดินลง",
        moveLeft: "เดินไปทางซ้าย",
        moveRight: "เดินไปทางขวา",
        speedUp: "วิ่ง",
        interact: "โต้ตอบ",
        follow: "ติดตาม",
        openChat: "เปิดแชท",
        openUserList: "เปิดรายชื่อผู้ใช้",
        toggleMapEditor: "แสดง/ซ่อนตัวแก้ไขแผนที่",
        rotatePlayer: "หมุนตัวละคร",
        emote1: "อีโมต 1",
        emote2: "อีโมต 2",
        emote3: "อีโมต 3",
        emote4: "อีโมต 4",
        emote5: "อีโมต 5",
        emote6: "อีโมต 6",
        openSayPopup: "เปิดป็อปอัปพูด",
        openThinkPopup: "เปิดป็อปอัปคิด",
        walkMyDesk: "เดินไปยังโต๊ะของฉัน",
    },
};

export default menu;
