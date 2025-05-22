import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    title: "قائمة", // Menu
    icon: {
        open: {
            menu: "افتح القائمة", // Open menu
            invite: "عرض الدعوة", // Show invite
            register: "تسجيل", // Register
            chat: "افتح الدردشة", // Open chat
            userlist: "قائمة المستخدمين", // User list
            openEmoji: "افتح نافذة الرموز التعبيرية", // Open emoji popup
            closeEmoji: "أغلق قائمة الرموز التعبيرية", // Close emoji menu
            mobile: "افتح قائمة الجوال", // Open mobile menu
            calendar: "افتح التقويم", // Open calendar
        },
    },
    visitCard: {
        close: "إغلاق", // Close
    },
    profile: {
        login: "تسجيل الدخول", // Login
        logout: "تسجيل الخروج", // Logout
    },
    settings: {
        videoBandwidth: {
            title: "جودة الفيديو", // Video quality
            low: "منخفض", // Low
            recommended: "موصى به", // Recommended
            unlimited: "غير محدود", // Unlimited
        },
        shareScreenBandwidth: {
            title: "جودة مشاركة الشاشة", // Screen sharing quality
            low: "منخفض", // Low
            recommended: "موصى به", // Recommended
            unlimited: "غير محدود", // Unlimited
        },
        language: {
            title: "اللغة", // Language
        },
        privacySettings: {
            title: "وضع الغياب", // Absence mode
            explanation: 'إذا لم يكن تبويب WorkAdventure نشطًا، سيتم التبديل إلى "وضع الغياب".', // If the WorkAdventure tab is not active, it will switch to "absence mode".
            cameraToggle: 'اترك الكاميرا مفعلة في "وضع الغياب".', // Keep camera active in "absence mode".
            microphoneToggle: 'اترك الميكروفون مفعلاً في "وضع الغياب".', // Keep microphone active in "absence mode".
        },
        save: "حفظ", // Save
        otherSettings: "إعدادات أخرى", // Other settings
        fullscreen: "ملء الشاشة", // Fullscreen
        notifications: "الإشعارات", // Notifications
        chatSounds: "أصوات الدردشة", // Chat sounds
        cowebsiteTrigger: "اسأل في كل مرة قبل فتح مواقع الويب أو غرف Jitsi-Meet", // Ask every time before opening websites or Jitsi-Meet rooms
        ignoreFollowRequest: "تجاهل طلبات المتابعة من المستخدمين الآخرين", // Ignore follow requests from other users
        blockAudio: "تعطيل الموسيقى والأصوات الخلفية", // Disable music and background sounds
        disableAnimations: "تعطيل الرسوم المتحركة للخرائط", // Disable map animations
    },
    invite: {
        description: "شارك الرابط إلى هذه الغرفة!", // Share the link to this room!
        copy: "نسخ", // Copy
        share: "مشاركة", // Share
        walkAutomaticallyToPosition: "اذهب تلقائيًا إلى موقعي", // Walk automatically to my position
        selectEntryPoint: "اختر نقطة الدخول", // Select entry point
    },
    globalMessage: {
        text: "نص", // Text
        audio: "صوت", // Audio
        warning: "إرسال إلى جميع الغرف في هذا العالم", // Send to all rooms in this world
        enter: "أدخل رسالتك هنا...", // Enter your message here...
        send: "إرسال", // Send
    },
    globalAudio: {
        uploadInfo: "رفع الملف", // Upload file
        error: "لم يتم اختيار ملف. يجب عليك رفع ملف قبل الإرسال.", // No file selected. You must upload a file before sending.
        errorUpload:
            "خطأ في رفع الملف. يرجى التحقق من ملفك والمحاولة مرة أخرى. إذا استمرت المشكلة، يرجى الاتصال بالمسؤول.", // Error uploading file. Please check your file and try again. If the problem persists, contact the administrator.
        dragAndDrop: "اسحب الملف هنا أو انقر لرفعه 🎧", // Drag and drop file here or click to upload 🎧
    },
    contact: {
        gettingStarted: {
            title: "البدء", // Getting started
            description:
                "مع WorkAdventure يمكنك إنشاء عالم عبر الإنترنت حيث يمكنك الاجتماع والتحدث مع الآخرين بشكل عفوي. ابدأ بإنشاء خريطتك الخاصة. يتوفر لك مجموعة كبيرة من الخرائط الجاهزة من فريقنا.", // With WorkAdventure you can create an online world where you can meet and talk to others spontaneously. Start by creating your own map. A large selection of ready-made maps from our team is available to you.
        },
        createMap: {
            title: "إنشاء خريطة خاصة", // Create your own map
            description: "يمكنك أيضًا إنشاء خريطتك الخاصة. اتبع دليلنا خطوة بخطوة.", // You can also create your own map. Follow our step-by-step guide.
        },
    },
    about: {
        mapInfo: "معلومات عن هذه الخريطة", // Information about this map
        mapLink: "رابط الخريطة", // Map link
        copyrights: {
            map: {
                title: "حقوق الطبع والنشر للخريطة", // Map copyright
                empty: "لم يقم منشئ الخريطة بتوفير معلومات حول حقوق الطبع والنشر.", // The map creator has not provided information about the copyright.
            },
            tileset: {
                title: "حقوق الطبع والنشر لمجموعات البلاط", // Tileset copyright
                empty: "لم يقم منشئ الخريطة بتوفير معلومات حول حقوق الطبع والنشر لمجموعات البلاط. هذا لا يعني أن مجموعات البلاط ليست خاضعة لأي ترخيص.", // The map creator has not provided information about the copyright of the tilesets. This does not mean that the tilesets are not subject to any license.
            },
            audio: {
                title: "حقوق الطبع والنشر للملفات الصوتية", // Audio files copyright
                empty: "لم يقم منشئ الخريطة بتوفير معلومات حول حقوق الطبع والنشر للملفات الصوتية. هذا لا يعني أن الملفات الصوتية ليست خاضعة لأي ترخيص.", // The map creator has not provided information about the copyright of the audio files. This does not mean that the audio files are not subject to any license.
            },
        },
    },
    sub: {
        profile: "الملف الشخصي", // Profile
        settings: "الإعدادات", // Settings
        invite: "دعوة", // Invite
        credit: "حول هذه الخريطة", // About this map
        globalMessages: "رسائل عالمية", // Global messages
        contact: "اتصال", // Contact
        report: "الإبلاغ عن خطأ", // Report an error
    },
};

export default menu;
