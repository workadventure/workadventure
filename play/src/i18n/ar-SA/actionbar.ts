import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    mapEditor: "فتح / إغلاق محرر الخرائط", // open / close map manager
    mapEditorMobileLocked: "محرر الخرائط مقفل في الوضع المحمول", // map editor is locked in mobile mode
    mapEditorLocked: "محرر الخرائط مقفل 🔐", // map editor is locked
    bo: "فتح المكتب الخلفي", // open back office
    subtitle: {
        microphone: "ميكروفون", // microphone
        speaker: "مكبر الصوت", // speaker
    },
    app: "فتح / إغلاق التطبيقات", // open / close applications
    listStatusTitle: {
        enable: "تغيير حالتك", // change your status
    },

    status: {
        ONLINE: "متصل", // online
        BACK_IN_A_MOMENT: "سأعود قريبا", // back in a moment
        DO_NOT_DISTURB: "الرجاء عدم الإزعاج", // do not disturb
        BUSY: "مشغول", // busy
    },
    globalMessage: "إرسال رسالة عامة", // send a global message
    help: {
        cam: {
            title: "بدء / إيقاف الكاميرا", // start / stop camera
        },
        mic: {
            title: "كتم / إلغاء كتم الميكروفون", // mute / unmute microphone
        },
        chat: {
            title: "فتح/إغلاق المحادثة", // open / close chat
        },
        follow: {
            title: "متابعة / إلغاء المتابعة", // open / close follow list
        },
        lock: {
            title: "قفل/فتح المحادثة", // lock / unlock discussion
        },
        share: {
            title: "بدء / إيقاف مشاركة الشاشة", // start / stop screen sharing
        },
        emoji: {
            title: "فتح / إغلاق الرموز التعبيرية", // open / close emoji
        },
        calendar: {
            title: "فتح / إغلاق التقويم", // open / close calendar
        },
        roomList: {
            title: "فتح / إغلاق قائمة الغرف", // open / close room list
        },
    },
};

export default actionbar;
