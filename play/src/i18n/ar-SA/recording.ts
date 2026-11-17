import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "تحديث",
    title: "قائمة التسجيلات الخاصة بك",
    noRecordings: "لم يتم العثور على تسجيلات",
    errorFetchingRecordings: "حدث خطأ أثناء جلب التسجيلات",
    expireIn: "تنتهي خلال {days} يوم{s}",
    expiresOn: "تنتهي في {date}",
    download: "تحميل",
    close: "إغلاق",
    recordingList: "التسجيلات",
    viewList: "عرض القائمة",
    viewCards: "عرض البطاقات",
    back: "رجوع",
    actions: "إجراءات",
    contextMenu: {
        openInNewTab: "فتح في علامة تبويب جديدة",
        delete: "حذف",
    },
    notification: {
        deleteNotification: "تم حذف التسجيل بنجاح",
        deleteFailedNotification: "فشل حذف التسجيل",
        startFailedNotification: "فشل بدء التسجيل",
        stopFailedNotification: "فشل إيقاف التسجيل",
        recordingStarted: "{name} بدأ تسجيلاً.",
        downloadFailedNotification: "فشل تحميل التسجيل",
        recordingComplete: "اكتمل التسجيل",
        recordingIsInProgress: "التسجيل قيد التقدم",
        unexpectedlyStoppedNotification: "توقف التسجيل بشكل غير متوقع",
        recordingSaved: "تم حفظ التسجيل بنجاح.",
        howToAccess: "للوصول إلى تسجيلاتك:",
        viewRecordings: "عرض التسجيلات",
    },
    actionbar: {
        title: {
            start: "بدء التسجيل",
            stop: "إيقاف التسجيل",
            inProgress: "التسجيل قيد التقدم",
        },
        desc: {
            needLogin: "يجب أن تكون مسجلاً الدخول للتسجيل.",
            advert: "سيتم إشعار جميع المشاركين بأنك تبدأ تسجيلاً.",
            yourRecordInProgress: "التسجيل قيد التقدم، انقر لإيقافه.",
            inProgress: "التسجيل قيد التقدم",
        },
        spacePicker: {
            title: "تسجيل",
            source: "ما الذي تريد تسجيله",
            savedHint: "يُحفظ في تسجيلاتك عند الإيقاف.",
            megaphone: "تسجيل مكبر الصوت",
            discussion: "تسجيل المناقشة",
            withMap: "تخطيط الفيديو:",
            camerasOnly: "الكاميرات فقط",
            camerasOnlyHint:
                "الكاميرات فقط، بدون الخريطة. لا يمكن توجيه هذا الفيديو أثناء التسجيل: لا توجد لوحة إخراج ولا تغيير للتخطيط أو التكبير.",
            layout: {
                map: "الخريطة أولاً",
                balanced: "متوازن",
                cameras: "الكاميرات أولاً",
            },
        },
        producer: {
            preview: "في الفيديو الآن",
            layout: "التخطيط",
            zoom: "التكبير",
            zoomLevel: {
                tight: "قريب",
                wide: "مصغّر",
                whole: "الخريطة كاملة",
            },
            framing: "التأطير",
            follow: "متابعة الفقاعة",
            frameMyView: "تأطير ما أراه",
            cameras: "الكاميرات",
            pin: "تثبيت",
            unpin: "إلغاء التثبيت",
            pinHint: "يحتفظ الشخص المثبّت ببلاطته حتى عندما يصمت (حتى {max}).",
        },
    },
};

export default recording;
