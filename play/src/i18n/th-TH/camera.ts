import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    editCam: "แก้ไขกล้อง",
    editMic: "แก้ไขไมโครโฟน",
    editSpeaker: "แก้ไขเอาต์พุตเสียง",
    active: "เปิดใช้งาน",
    disabled: "ปิดใช้งาน",
    notRecommended: "ไม่แนะนำ",
    enable: {
        title: "เปิดกล้องและไมโครโฟนของคุณ",
        start: "ยินดีต้อนรับสู่หน้าตั้งค่าอุปกรณ์เสียงและวิดีโอ! ที่นี่คุณจะพบเครื่องมือที่ช่วยยกระดับประสบการณ์ออนไลน์ของคุณ ปรับการตั้งค่าตามที่ต้องการเพื่อแก้ไขปัญหาที่อาจเกิดขึ้น ตรวจสอบว่าอุปกรณ์ของคุณเชื่อมต่อถูกต้องและเป็นเวอร์ชันล่าสุด ลองทดสอบการตั้งค่าต่าง ๆ เพื่อหาสิ่งที่เหมาะกับคุณที่สุด",
    },
    help: {
        title: "ต้องการสิทธิ์เข้าถึงกล้อง / ไมโครโฟน",
        cameraTitle: "ต้องการสิทธิ์เข้าถึงกล้อง",
        microphoneTitle: "ต้องการสิทธิ์เข้าถึงไมโครโฟน",
        permissionDenied: "ไม่ได้รับอนุญาต",
        cameraPermissionDenied: "การเข้าถึงกล้องถูกปฏิเสธ",
        microphonePermissionDenied: "การเข้าถึงไมโครโฟนถูกปฏิเสธ",
        cameraMicrophonePermissionDenied: "การเข้าถึงกล้องและไมโครโฟนถูกปฏิเสธ",
        content: "คุณต้องอนุญาตให้เข้าถึงกล้องและไมโครโฟนในเบราว์เซอร์ของคุณ",
        cameraContent: "คุณต้องอนุญาตให้เข้าถึงกล้องในเบราว์เซอร์ของคุณ",
        microphoneContent: "คุณต้องอนุญาตให้เข้าถึงไมโครโฟนในเบราว์เซอร์ของคุณ",
        firefoxContent: 'กรุณาทำเครื่องหมายที่ช่อง "Remember this decision" หากไม่ต้องการให้ Firefox ถามสิทธิ์ซ้ำอีก',
        allow: "อนุญาตเว็บแคม",
        allowMicrophone: "อนุญาตไมโครโฟน",
        allowCameraMicrophone: "อนุญาตเว็บแคมและไมโครโฟน",
        continue: "ดำเนินการต่อโดยไม่ใช้เว็บแคม",
        continueWithoutMicrophone: "ดำเนินการต่อโดยไม่ใช้ไมโครโฟน",
        continueCameraMicrophone: "ดำเนินการต่อโดยไม่ใช้เว็บแคมและไมโครโฟน",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
        tooltip: {
            permissionDeniedTitle: "การเข้าถึงกล้องถูกบล็อก",
            permissionDeniedDesc:
                "เบราว์เซอร์ของคุณปฏิเสธการเข้าถึงกล้องสำหรับเว็บไซต์นี้ อนุญาตได้จากแถบที่อยู่ (ไอคอนแม่กุญแจหรือกล้อง) หรือในการตั้งค่าเว็บไซต์ ภาพประกอบด้านล่างตรงกับเบราว์เซอร์ของคุณ",
            noDeviceTitle: "ไม่พบกล้องที่ใช้งานได้",
            noDeviceDesc:
                "เบราว์เซอร์ของคุณไม่พบกล้องที่สามารถใช้งานได้ ลองใช้เบราว์เซอร์อื่น ตรวจสอบว่ามีกล้องเชื่อมต่ออยู่ ตรวจสอบการตั้งค่าคอมพิวเตอร์ของคุณ (ความเป็นส่วนตัว อุปกรณ์) หรือรีสตาร์ตคอมพิวเตอร์หากอุปกรณ์ควรใช้งานได้",
            permissionMedia: {
                firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
                chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
                safari: "/resources/help-setting-camera-permission/en-US-firefox.png",
                android: "/resources/help-setting-camera-permission/en-US-firefox.png",
                default: "/resources/help-setting-camera-permission/en-US-firefox.png",
            },
        },
        microphoneTooltip: {
            permissionDeniedTitle: "การเข้าถึงไมโครโฟนถูกบล็อก",
            permissionDeniedDesc:
                "เบราว์เซอร์ของคุณปฏิเสธการเข้าถึงไมโครโฟนสำหรับเว็บไซต์นี้ อนุญาตได้จากแถบที่อยู่ (ไอคอนแม่กุญแจหรือไมโครโฟน) หรือในการตั้งค่าเว็บไซต์ ภาพประกอบด้านล่างตรงกับเบราว์เซอร์ของคุณ",
            noDeviceTitle: "ไม่พบไมโครโฟนที่ใช้งานได้",
            noDeviceDesc:
                "เบราว์เซอร์ของคุณไม่พบไมโครโฟนที่สามารถใช้งานได้ ลองใช้เบราว์เซอร์อื่น ตรวจสอบว่ามีไมโครโฟนเชื่อมต่ออยู่ ตรวจสอบการตั้งค่าคอมพิวเตอร์ของคุณ (ความเป็นส่วนตัว อุปกรณ์) หรือรีสตาร์ตคอมพิวเตอร์หากอุปกรณ์ควรใช้งานได้",
            permissionMedia: {
                firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
                chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
                safari: "/resources/help-setting-camera-permission/en-US-firefox.png",
                android: "/resources/help-setting-camera-permission/en-US-firefox.png",
                default: "/resources/help-setting-camera-permission/en-US-firefox.png",
            },
        },
    },
    webrtc: {
        title: "ข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์รีเลย์วิดีโอ",
        titlePending: "กำลังรอการเชื่อมต่อเซิร์ฟเวอร์รีเลย์วิดีโอ",
        error: "ไม่สามารถเข้าถึงเซิร์ฟเวอร์ TURN ได้",
        content: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์รีเลย์วิดีโอได้ คุณอาจไม่สามารถสื่อสารกับผู้ใช้คนอื่นได้",
        solutionVpn: "หากคุณ<strong>เชื่อมต่อผ่าน VPN</strong> กรุณาตัดการเชื่อมต่อ VPN แล้วรีเฟรชหน้าเว็บ",
        solutionVpnNotAskAgain: "เข้าใจแล้ว ไม่ต้องเตือนฉันอีก 🫡",
        solutionHotspot:
            "หากคุณอยู่ในเครือข่ายที่ถูกจำกัด (เครือข่ายบริษัท...) ลองเปลี่ยนเครือข่าย เช่น สร้าง<strong>ฮอตสปอต Wifi</strong> ด้วยโทรศัพท์ของคุณแล้วเชื่อมต่อผ่านโทรศัพท์",
        solutionNetworkAdmin: "หากคุณเป็น<strong>ผู้ดูแลเครือข่าย</strong> กรุณาดูคู่มือ ",
        preparingYouNetworkGuide: '"Preparing your network"',
        refresh: "รีเฟรช",
        continue: "ดำเนินการต่อ",
        newDeviceDetected: "ตรวจพบอุปกรณ์ใหม่ {device} 🎉 เปลี่ยนไหม? [SPACE] ไม่สนใจ [ESCAPE]",
    },
    my: {
        silentZone: "โซนเงียบ",
        silentZoneDesc:
            "คุณอยู่ในโซนเงียบ คุณจะเห็นและได้ยินเฉพาะคนที่อยู่กับคุณเท่านั้น และจะไม่เห็นหรือได้ยินคนอื่น ๆ ในห้อง",
        nameTag: "คุณ",
        loading: "กำลังโหลดกล้องของคุณ...",
    },
    disable: "ปิดกล้องของคุณ",
    menu: {
        moreAction: "การดำเนินการเพิ่มเติม",
        closeMenu: "ปิดเมนู",
        senPrivateMessage: "ส่งข้อความส่วนตัว (เร็ว ๆ นี้)",
        kickoffUser: "เชิญผู้ใช้ออก",
        muteAudioUser: "ปิดเสียง",
        askToMuteAudioUser: "ขอให้ปิดเสียง",
        muteAudioEveryBody: "ปิดเสียงสำหรับทุกคน",
        muteVideoUser: "ปิดวิดีโอ",
        askToMuteVideoUser: "ขอให้ปิดวิดีโอ",
        muteVideoEveryBody: "ปิดวิดีโอสำหรับทุกคน",
        blockOrReportUser: "การจัดการ",
    },
    backgroundEffects: {
        imageTitle: "ภาพพื้นหลัง",
        videoTitle: "วิดีโอพื้นหลัง",
        blurTitle: "เบลอพื้นหลัง",
        resetTitle: "ปิดเอฟเฟกต์พื้นหลัง",
        title: "เอฟเฟกต์พื้นหลัง",
        close: "ปิด",
        blurAmount: "ระดับความเบลอ",
    },
};

export default camera;
