import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "الحالة جيدة ✅",
        offLine: "الحالة غير متصلة ❌",
        warning: "الحالة تحذير ⚠️",
        sync: "الحالة تتم المزامنة 🔄",
    },
    teams: {
        openingMeeting: "جاري فتح اجتماع Teams...",
        unableJoinMeeting: "غير قادر على الانضمام إلى اجتماع Teams!",
        userNotConnected: "أنت غير متصل بـ Teams!",
        connectToYourTeams: "اتصل بحساب Teams الخاص بك 🙏",
        temasAppInfo:
            "Teams هو تطبيق Microsoft 365 يساعد فريقك على البقاء متصلًا ومنظمًا. يمكنك الدردشة، الاجتماع، الاتصال، والتعاون في مكان واحد 😍",
        buttonSync: "مزامنة Teams الخاص بي 🚀",
        buttonConnect: "اتصال بـ Teams الخاص بي 🚀",
    },
    discord: {
        integration: "التكامل",
        explainText:
            "من خلال ربط حساب Discord الخاص بك هنا، ستتمكن من تلقي رسائلك مباشرة في دردشة Workadventure. بعد مزامنة الخادم، سنقوم بإنشاء الغرف التي يحتوي عليها، عليك فقط الانضمام إليها في واجهة دردشة Workadventure.",
        login: "اتصل بـ Discord",
        fetchingServer: "جلب خوادم Discord الخاصة بك... 👀",
        qrCodeTitle: "امسح رمز QR باستخدام تطبيق Discord لتسجيل الدخول.",
        qrCodeExplainText:
            "امسح رمز QR باستخدام تطبيق Discord لتسجيل الدخول. رموز QR محدودة الوقت، أحيانًا تحتاج إلى إنشاء رمز جديد",
        qrCodeRegenerate: "احصل على رمز QR جديد",
        tokenInputLabel: "رمز Discord",
        loginToken: "تسجيل الدخول باستخدام الرمز",
        loginTokenExplainText: "تحتاج إلى إدخال رمز Discord الخاص بك. لإجراء تكامل Discord، انظر",
        sendDiscordToken: "إرسال",
        tokenNeeded: "تحتاج إلى إدخال رمز Discord الخاص بك. لإجراء تكامل Discord، انظر",
        howToGetTokenButton: "كيفية الحصول على رمز تسجيل الدخول الخاص بـ Discord",
        loggedIn: "متصل بـ:",
        saveSync: "حفظ ومزامنة",
        logout: "تسجيل الخروج",
        back: "رجوع",
        tokenPlaceholder: "رمز Discord الخاص بك",
        loginWithQrCode: "تسجيل الدخول باستخدام رمز QR",
        guilds: "خوادم Discord",
        guildExplain: "حدد القنوات التي تريد إضافتها إلى واجهة دردشة Workadventure.\n",
    },
    outlook: {
        signIn: "تسجيل الدخول باستخدام Outlook",
        popupScopeToSync: "الاتصال بحساب Outlook الخاص بي",
        popupScopeToSyncExplainText:
            "نحتاج إلى الاتصال بحساب Outlook الخاص بك لمزامنة تقويمك و/أو مهامك. سيمكنك ذلك من عرض اجتماعاتك ومهامك في WorkAdventure والانضمام إليها مباشرة من الخريطة.",
        popupScopeToSyncCalendar: "مزامنة التقويم الخاص بي",
        popupScopeToSyncTask: "مزامنة مهامي",
        popupCancel: "إلغاء",
        isSyncronized: "تمت المزامنة مع Outlook",
        popupScopeIsConnectedExplainText: "أنت متصل بالفعل، يرجى النقر على الزر لتسجيل الخروج وإعادة الاتصال.",
        popupScopeIsConnectedButton: "تسجيل الخروج",
        popupErrorTitle: "⚠️ فشل مزامنة وحدة Outlook أو Teams",
        popupErrorDescription: "فشلت مزامنة تهيئة وحدة Outlook أو Teams. للاتصال، يرجى محاولة إعادة الاتصال.",
        popupErrorContactAdmin: "إذا استمرت المشكلة، يرجى الاتصال بمسؤولك.",
        popupErrorShowMore: "عرض المزيد من المعلومات",
        popupErrorMoreInfo1:
            "قد تكون هناك مشكلة في عملية تسجيل الدخول. يرجى التحقق من أن موفر SSO Azure مُكوّن بشكل صحيح.",
        popupErrorMoreInfo2:
            'يرجى التحقق من أن النطاق "offline_access" مفعّل لموفر SSO Azure. هذا النطاق مطلوب للحصول على رمز التحديث والحفاظ على اتصال وحدة Teams أو Outlook.',
    },
    google: {
        signIn: "تسجيل الدخول باستخدام Google",
        popupScopeToSync: "الاتصال بحساب Google الخاص بي",
        popupScopeToSyncExplainText:
            "نحتاج إلى الاتصال بحساب Google الخاص بك لمزامنة تقويمك و/أو مهامك. سيمكنك ذلك من عرض اجتماعاتك ومهامك في WorkAdventure والانضمام إليها مباشرة من الخريطة.",
        popupScopeToSyncCalendar: "مزامنة التقويم الخاص بي",
        popupScopeToSyncTask: "مزامنة مهامي",
        popupCancel: "إلغاء",
        isSyncronized: "تمت المزامنة مع Google",
        popupScopeToSyncMeet: "إنشاء اجتماعات عبر الإنترنت",
        openingMeet: "جاري فتح Google Meet... 🙏",
        unableJoinMeet: "غير قادر على الانضمام إلى Google Meet 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "جارٍ إنشاء مساحة Google… سيستغرق الأمر لحظة فقط 💪",
            guestError: "لست متصلاً، لذلك لا يمكنك إنشاء اجتماع Google Meet 😭",
            guestExplain: "يرجى تسجيل الدخول إلى المنصة لإنشاء اجتماع Google Meet، أو اطلب من المالك إنشاؤه لك 🚀",
            error: "إعدادات Google Workspace لديك لا تسمح بإنشاء اجتماع Meet.",
            errorExplain: "لا تقلق — ما زال بإمكانك الانضمام إلى الاجتماعات عندما يشارك شخص آخر الرابط 🙏",
        },
        popupScopeIsConnectedButton: "تسجيل الخروج",
        popupScopeIsConnectedExplainText: "أنت متصل بالفعل، يرجى النقر على الزر لتسجيل الخروج وإعادة الاتصال.",
    },
    calendar: {
        title: "اجتماعاتك اليوم",
        joinMeeting: "انقر هنا للانضمام إلى الاجتماع",
    },
    todoList: {
        title: "المهام",
        sentence: "خذ استراحة 🙏 ربما فنجان قهوة أو شاي؟ ☕",
    },
};

export default externalModule;
