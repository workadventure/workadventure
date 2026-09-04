import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "สถานะปกติ ✅",
        offLine: "สถานะออฟไลน์ ❌",
        warning: "สถานะมีคำเตือน ⚠️",
        sync: "กำลังซิงก์สถานะ 🔄",
    },
    teams: {
        openingMeeting: "กำลังเปิดการประชุม Teams...",
        unableJoinMeeting: "ไม่สามารถเข้าร่วมการประชุม Teams ได้!",
        userNotConnected: "คุณยังไม่ได้ซิงก์กับบัญชี Outlook หรือ Google ของคุณ!",
        connectToYourTeams: "เชื่อมต่อกับบัญชี Outlook หรือ Google ของคุณ 🙏",
        temasAppInfo:
            "Teams คือแอปใน Microsoft 365 ที่ช่วยให้ทีมของคุณติดต่อสื่อสารและจัดระเบียบงานได้ คุณสามารถแชท ประชุม โทร และทำงานร่วมกันได้ในที่เดียว 😍",
        buttonSync: "ซิงก์ Teams ของฉัน 🚀",
        buttonConnect: "เชื่อมต่อ Teams ของฉัน 🚀",
        meetingPopupWaiting: {
            title: "การประชุม Microsoft Teams 🎉",
            subtitle: "การประชุม Teams ยังไม่ถูกสร้าง... กำลังดำเนินการอยู่ 💪",
            guestExplain: "กรุณาเชื่อมต่อกับแพลตฟอร์มเพื่อสร้างการประชุมออนไลน์ Teams หรือขอให้เจ้าของสร้างให้คุณ 🚀",
            guestError: "คุณยังไม่ได้เชื่อมต่อ จึงไม่สามารถสร้างการประชุมออนไลน์ Teams ได้ 😭",
            missingScope: "ไม่มีการสร้างการประชุม: บัญชี Microsoft ของคุณไม่ได้รับอนุญาตให้สร้างการประชุม",
            missingScopeExplain:
                "รอผู้เข้าร่วมที่สามารถสร้างได้ หรือเชื่อมต่อใหม่ — หากผู้ดูแลระบบเพิ่งเปิดสิทธิ์ให้ การเชื่อมต่อใหม่ก็เพียงพอ",
            error: "ไม่สามารถสร้างการประชุม Teams ได้",
            errorExplain: "ไม่ต้องกังวล คุณยังสามารถเข้าร่วมการประชุมที่คนอื่นสร้างได้ 🙏",
            reconnect: "เชื่อมต่อ Teams ใหม่",
        },
    },
    discord: {
        integration: "การเชื่อมต่อ",
        explainText:
            "เมื่อเชื่อมต่อบัญชี Discord ของคุณที่นี่ คุณจะสามารถรับข้อความของคุณได้โดยตรงในแชทของ WorkAdventure หลังจากซิงก์เซิร์ฟเวอร์แล้ว เราจะสร้างห้องต่าง ๆ ที่อยู่ในเซิร์ฟเวอร์นั้น คุณเพียงแค่เข้าร่วมห้องเหล่านั้นในแชทของ WorkAdventure",
        login: "เชื่อมต่อกับ Discord",
        fetchingServer: "กำลังดึงข้อมูลเซิร์ฟเวอร์ Discord ของคุณ... 👀",
        qrCodeTitle: "สแกนคิวอาร์โค้ดด้วยแอป Discord ของคุณเพื่อเข้าสู่ระบบ",
        qrCodeExplainText:
            "สแกนคิวอาร์โค้ดด้วยแอป Discord ของคุณเพื่อเข้าสู่ระบบ คิวอาร์โค้ดมีเวลาจำกัด บางครั้งคุณอาจต้องสร้างใหม่",
        qrCodeRegenerate: "ขอคิวอาร์โค้ดใหม่",
        tokenInputLabel: "โทเคน Discord",
        loginToken: "เข้าสู่ระบบด้วยโทเคน",
        loginTokenExplainText: "คุณต้องกรอกโทเคน Discord ของคุณ วิธีทำการเชื่อมต่อ Discord ดูได้ที่",
        sendDiscordToken: "ส่ง",
        tokenNeeded: "คุณต้องกรอกโทเคน Discord ของคุณ วิธีทำการเชื่อมต่อ Discord ดูได้ที่",
        howToGetTokenButton: "วิธีรับโทเคนเข้าสู่ระบบ Discord ของฉัน",
        loggedIn: "เชื่อมต่อด้วย:",
        saveSync: "บันทึกและซิงก์",
        logout: "ออกจากระบบ",
        back: "กลับ",
        tokenPlaceholder: "โทเคน Discord ของคุณ",
        loginWithQrCode: "เข้าสู่ระบบด้วยคิวอาร์โค้ด",
        guilds: "เซิร์ฟเวอร์ Discord",
        guildExplain: "เลือกช่องที่คุณต้องการเพิ่มลงในหน้าแชทของ WorkAdventure\n",
    },
    outlook: {
        signIn: "ลงชื่อเข้าใช้ด้วย Outlook",
        popupScopeToSync: "เชื่อมต่อบัญชี Outlook ของฉัน",
        popupScopeToSyncExplainText:
            "เราจำเป็นต้องเชื่อมต่อกับบัญชี Outlook ของคุณเพื่อซิงก์ปฏิทินและ/หรืองานของคุณ ซึ่งจะช่วยให้คุณเห็นการประชุมและงานต่าง ๆ ใน WorkAdventure และเข้าร่วมได้โดยตรงจากแผนที่",
        popupScopeToSyncCalendar: "ซิงก์ปฏิทินของฉัน",
        popupScopeToSyncTask: "ซิงก์งานของฉัน",
        popupCancel: "ยกเลิก",
        isSyncronized: "ซิงก์กับ Outlook แล้ว",
        popupScopeIsConnectedExplainText: "คุณเชื่อมต่ออยู่แล้ว กรุณาคลิกปุ่มเพื่อออกจากระบบแล้วเชื่อมต่อใหม่",
        popupScopeIsConnectedButton: "ออกจากระบบ",
        popupErrorTitle: "⚠️ การซิงก์โมดูล Outlook หรือ Teams ล้มเหลว",
        popupErrorDescription: "การเริ่มต้นซิงก์โมดูล Outlook หรือ Teams ล้มเหลว กรุณาลองเชื่อมต่อใหม่อีกครั้ง",
        popupErrorContactAdmin: "หากปัญหายังคงอยู่ กรุณาติดต่อผู้ดูแลระบบของคุณ",
        popupErrorShowMore: "แสดงข้อมูลเพิ่มเติม",
        popupErrorMoreInfo1:
            "อาจมีปัญหากับขั้นตอนการลงชื่อเข้าใช้ กรุณาตรวจสอบว่าผู้ให้บริการ SSO Azure ได้รับการตั้งค่าอย่างถูกต้อง",
        popupErrorMoreInfo2:
            'กรุณาตรวจสอบว่าสโคป "offline_access" เปิดใช้งานอยู่สำหรับผู้ให้บริการ SSO Azure สโคปนี้จำเป็นต่อการรับ refresh token และรักษาการเชื่อมต่อของโมดูล Teams หรือ Outlook',
    },
    google: {
        signIn: "ลงชื่อเข้าใช้ด้วย Google",
        popupScopeToSync: "เชื่อมต่อบัญชี Google ของฉัน",
        popupScopeToSyncExplainText:
            "เราจำเป็นต้องเชื่อมต่อกับบัญชี Google ของคุณเพื่อซิงก์ปฏิทินและ/หรืองานของคุณ ซึ่งจะช่วยให้คุณเห็นการประชุมและงานต่าง ๆ ใน WorkAdventure และเข้าร่วมได้โดยตรงจากแผนที่",
        popupScopeToSyncCalendar: "ซิงก์ปฏิทินของฉัน",
        popupScopeToSyncTask: "ซิงก์งานของฉัน",
        popupCancel: "ยกเลิก",
        isSyncronized: "ซิงก์กับ Google แล้ว",
        popupScopeToSyncMeet: "สร้างการประชุมออนไลน์",
        popupScopeToSyncMeetHelp: "จำเป็นสำหรับการสร้างการประชุมในพื้นที่ Google Meet",
        openingMeet: "กำลังเปิด Google Meet... 🙏",
        unableJoinMeet: "ไม่สามารถเข้าร่วม Google Meet ได้ 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "กำลังสร้าง Google Space ของคุณ… ใช้เวลาเพียงไม่กี่วินาที 💪",
            guestError: "คุณยังไม่ได้เชื่อมต่อ จึงไม่สามารถสร้าง Google Meet ได้ 😭",
            guestExplain: "กรุณาเข้าสู่ระบบแพลตฟอร์มเพื่อสร้าง Google Meet หรือขอให้เจ้าของสร้างให้คุณ 🚀",
            error: "การตั้งค่า Google Workspace ของคุณไม่อนุญาตให้สร้าง Meet",
            errorExplain: "ไม่ต้องกังวล คุณยังสามารถเข้าร่วมการประชุมเมื่อคนอื่นแชร์ลิงก์ได้ 🙏",
            missingScope: "ไม่มีการสร้างการประชุม: บัญชี Google ของคุณไม่ได้ให้สิทธิ์การสร้างการประชุม",
            missingScopeExplain: "รอผู้เข้าร่วมที่สามารถสร้างได้ หรือเชื่อมต่อใหม่และอนุญาตการสร้างการประชุม",
            reconnect: "เชื่อมต่อ Google ใหม่",
        },
        popupScopeIsConnectedButton: "ออกจากระบบ",
        popupScopeIsConnectedExplainText: "คุณเชื่อมต่ออยู่แล้ว กรุณาคลิกปุ่มเพื่อออกจากระบบแล้วเชื่อมต่อใหม่",
    },
    calendar: {
        title: "การประชุมของคุณวันนี้",
        joinMeeting: "คลิกที่นี่เพื่อเข้าร่วมการประชุม",
    },
    todoList: {
        title: "สิ่งที่ต้องทำ",
        sentence: "พักสักหน่อย 🙏 ดื่มกาแฟหรือชาสักแก้วไหม? ☕",
    },
};

export default externalModule;
