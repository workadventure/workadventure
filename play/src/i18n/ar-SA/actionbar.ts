import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    chat: "فتح/إغلاق المحادثة", // open / close chat
    follow: "متابعة", // follow
    unfollow: "إلغاء المتابعة", // unfollow
    lock: "قفل/فتح المحادثة", // lock / unlock discussion
    screensharing: "بدء / إيقاف مشاركة الشاشة", // start / stop screen sharing
    layout: "تغيير طريقة العرض", // toggle grid view
    disableLayout: "غير متاح عندما يكون هناك شخص واحد فقط في الاجتماع", // not available when only one person is in the meeting
    camera: "بدء / إيقاف الكاميرا", // start / stop camera
    microphone: "كتم / إلغاء كتم الميكروفون", // mute / unmute microphone
    emoji: "فتح / إغلاق الرموز التعبيرية", // open / close emoji
    disableMegaphone: "تعطيل مكبر الصوت", // disable megaphone
    menu: "فتح / إغلاق القائمة", // open / close menu
    calendar: "فتح / إغلاق التقويم", // open / close calendar
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
        inMeeting: "استمتع بالاجتماع 🤓", // enjoy the meeting
        inSilentZone: "استمتع بالمنطقة الصامتة 😁", // enjoy the silent zone
    },

    status: {
        ONLINE: "متصل", // online
        BACK_IN_A_MOMENT: "سأعود قريبا", // back in a moment
        DO_NOT_DISTURB: "الرجاء عدم الإزعاج", // do not disturb
        BUSY: "مشغول", // busy
    },
    globalMessage: "إرسال رسالة عامة", // send a global message
    roomList: "فتح / إغلاق قائمة الغرف", // open / close room list
};

export default actionbar;
