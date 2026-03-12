import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} يريد مناقشتك", // {name} wants to discuss with you
    message: "{name} يرسل رسالة", // {name} sends a message
    chatRoom: "في المنتدى", // in the forum
    askToMuteMicrophone: "يرجى كتم الميكروفون 🙏", // please mute your microphone
    askToMuteCamera: "يرجى كتم الكاميرا 🙏", // please mute your camera
    microphoneMuted: "تم كتم ميكروفونك بواسطة مشرف",
    cameraMuted: "تم كتم كاميرتك بواسطة مشرف",
    announcement: "إعلان",
    open: "فتح",
    help: {
        title: "تم رفض الوصول إلى الإشعارات", // access to notifications denied
        permissionDenied: "تم الرفض", // access denied
        content:
            "لا تفوت أي مناقشة. قم بتمكين الإشعارات لتكون على علم عندما يريد شخص ما التحدث معك، حتى لو لم تكن في علامة تبويب WorkAdventure.", // don't miss any discussion. Enable notifications to be informed when someone wants to talk to you, even if you are not in the WorkAdventure tab.
        firefoxContent: 'يرجى النقر على مربع "تذكر هذا القرار" إذا كنت لا تريد أن يستمر Firefox في طلب الإذن.', // please click on the "Remember this decision" box if you don't want Firefox to keep asking for permission.
        refresh: "تحديث", // refresh
        continue: "المتابعة بدون إشعار", // continue without notification
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png", // firefox
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png", // chrome
        },
    },
    addNewTag: "إضافة علامة جديدة: '{tag}'", // add new tag: '{tag}'
    screenSharingError: "تعذر بدء مشاركة الشاشة",
    notificationSentToMuteMicrophone: "تم إرسال إشعار إلى {name} لكتم ميكروفونه",
    notificationSentToMuteCamera: "تم إرسال إشعار إلى {name} لكتم كاميرته",
    recordingStarted: "بدأ شخص واحد في المناقشة تسجيلاً.",
    urlCopiedToClipboard: "تم نسخ الرابط إلى الحافظة",
};

export default notification;
