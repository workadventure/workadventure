import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    editCam: "تحرير الكاميرا",
    editMic: "تحرير الميكروفون",
    editSpeaker: "تحرير إخراج الصوت",
    active: "نشط",
    disabled: "معطل",
    notRecommended: "غير موصى به",
    enable: {
        title: "يرجى تشغيل الكاميرا والميكروفون.", // Please turn on your camera and microphone.
        start: "لنبدأ!", // Let's start!
    },
    help: {
        title: "مطلوب الوصول إلى الكاميرا / الميكروفون", // Access to camera/microphone required
        permissionDenied: "تم الرفض", // Access denied
        content: "يجب السماح بالوصول إلى الكاميرا والميكروفون في المتصفح.", // Access to camera and microphone must be allowed in the browser.
        firefoxContent: 'يرجى النقر على زر "حفظ هذا القرار" لمنع طلبات الإذن المتكررة في Firefox.', // Please click the "Save this decision" button to prevent repeated permission requests in Firefox.
        continue: "المتابعة بدون كاميرا", // Continue without camera
        allow: "السماح بالكاميرا", // Allow camera
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
        tooltip: {
            permissionDeniedTitle: "تم حظر الوصول إلى الكاميرا",
            permissionDeniedDesc:
                "رفض المتصفح الوصول إلى الكاميرا لهذا الموقع. اسمح بها من شريط العناوين (أيقونة القفل أو الكاميرا) أو من إعدادات الموقع. الصورة أدناه تناسب متصفحك.",
            noDeviceTitle: "لا توجد كاميرا صالحة للاستخدام",
            noDeviceDesc:
                "المتصفح لا يكتشف أي كاميرا يمكن استخدامها. جرّب متصفحًا آخر، أو تحقق من توصيل الكاميرا، أو تحقق من إعدادات الجهاز (الخصوصية، الأجهزة)، أو أعد تشغيل الجهاز إذا كان يفترض أن يعمل.",
            permissionMedia: {
                firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
                chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
                safari: "/resources/help-setting-camera-permission/en-US-firefox.png",
                android: "/resources/help-setting-camera-permission/en-US-firefox.png",
                default: "/resources/help-setting-camera-permission/en-US-firefox.png",
            },
        },
        microphoneTooltip: {
            permissionDeniedTitle: "تم حظر الوصول إلى الميكروفون",
            permissionDeniedDesc:
                "رفض المتصفح الوصول إلى الميكروفون لهذا الموقع. اسمح به من شريط العناوين (أيقونة القفل أو الميكروفون) أو من إعدادات الموقع. الصورة أدناه تناسب متصفحك.",
            noDeviceTitle: "لا يوجد ميكروفون صالح للاستخدام",
            noDeviceDesc:
                "المتصفح لا يكتشف أي ميكروفون يمكن استخدامه. جرّب متصفحًا آخر، أو تحقق من توصيل الميكروفون، أو تحقق من إعدادات الجهاز (الخصوصية، الأجهزة)، أو أعد تشغيل الجهاز إذا كان يفترض أن يعمل.",
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
        title: "خادم ترحيل الفيديو لا يستجيب - خطأ", // The video relay server is not responding - Error
        titlePending: "الاتصال بخادم ترحيل الفيديو", // Connecting to the video relay server
        error: 'خادم "TURN" غير متاح', // "TURN" server not reachable
        content: "لم يتمكن من إنشاء اتصال بخادم ترحيل الفيديو. قد لا تتمكن من التواصل مع المستخدمين الآخرين.", // A connection to the video relay server could not be established. You may not be able to communicate with other users.
        solutionVpn: "إذا كنت تتصل عبر VPN، يرجى قطع الاتصال بـ VPN وتحديث الصفحة.", // If you are connecting via VPN, please disconnect from the VPN and refresh the page.
        solutionHotspot:
            "إذا كنت في شبكة مقيدة (شبكة الشركة...)، حاول تغيير الشبكة. على سبيل المثال، قم بإنشاء نقطة اتصال Wi-Fi باستخدام هاتفك واتصل عبر هاتفك.", // If you are in a restricted network (company network...), try changing the network. For example, create a Wi-Fi hotspot with your phone and connect via your phone.
        solutionNetworkAdmin: "إذا كنت مسؤول الشبكة، تحقق من", // If you are a network administrator, check the
        preparingYouNetworkGuide: 'دليل "إعداد شبكتك"', // "Preparing your network" guide
        refresh: "تحديث", // Refresh
        continue: "استمرار", // Continue
        solutionVpnNotAskAgain: "فهمت. لا تحذرني مرة أخرى 🫡",
        newDeviceDetected: "تم اكتشاف جهاز جديد {device} 🎉 التبديل؟ [SPACE] تجاهل [ESC]",
    },
    my: {
        silentZone: "منطقة صامتة", // Silent zone
        nameTag: "أنت", // You
        silentZoneDesc:
            "أنت في منطقة صامتة. لا يمكنك سوى رؤية وسماع الأشخاص الذين معك. لا يمكنك رؤية أو سماع الأشخاص الآخرين في الغرفة.",
        loading: "جارٍ تحميل الكاميرا...", // Loading your camera...
    },
    disable: "إيقاف الكاميرا", // Disable camera
    menu: {
        moreAction: "خيارات إضافية", // More actions
        closeMenu: "إغلاق القائمة", // Close menu
        senPrivateMessage: "إرسال رسالة خاصة (قريبًا)", // Send private message (coming soon)
        kickoffUser: "طرد المستخدم", // Kick off user
        muteAudioUser: "كتم صوت المستخدم", // Mute user's audio
        askToMuteAudioUser: "طلب كتم الصوت", // Ask to mute audio
        muteAudioEveryBody: "كتم الصوت للجميع", // Mute audio for everybody
        muteVideoUser: "كتم فيديو المستخدم", // Mute user's video
        askToMuteVideoUser: "طلب كتم الفيديو", // Ask to mute video
        muteVideoEveryBody: "كتم الفيديو للجميع", // Mute video for everybody
        blockOrReportUser: "الإشراف", // Moderation
    },
    backgroundEffects: {
        imageTitle: "صور الخلفية", // Background Images
        videoTitle: "فيديوهات الخلفية", // Background Videos
        blurTitle: "ضبابية الخلفية", // Background Blur
        resetTitle: "تعطيل تأثيرات الخلفية", // Disable background effects
        title: "تأثيرات الخلفية", // Background Effects
        close: "إغلاق", // Close
        blurAmount: "مقدار الضبابية", // Blur Amount
    },
};

export default camera;
