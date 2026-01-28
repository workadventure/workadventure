import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "تحديث",
    title: "قائمة التسجيلات الخاصة بك",
    noRecordings: "لم يتم العثور على تسجيلات",
    errorFetchingRecordings: "حدث خطأ أثناء جلب التسجيلات",
    expireIn: "تنتهي خلال {days} يوم{s}",
    download: "تحميل",
    close: "إغلاق",
    ok: "حسناً",
    recordingList: "التسجيلات",
    contextMenu: {
        openInNewTab: "فتح في علامة تبويب جديدة",
        delete: "حذف",
    },
    notification: {
        deleteNotification: "تم حذف التسجيل بنجاح",
        deleteFailedNotification: "فشل حذف التسجيل",
        recordingStarted: "بدأ شخص واحد في المناقشة تسجيلاً.",
        downloadFailedNotification: "فشل تحميل التسجيل",
        recordingComplete: "اكتمل التسجيل",
        recordingIsInProgress: "التسجيل قيد التقدم",
        recordingSaved: "تم حفظ التسجيل بنجاح.",
        howToAccess: "للوصول إلى تسجيلاتك:",
        viewRecordings: "عرض التسجيلات",
    },
    actionbar: {
        title: {
            start: "بدء التسجيل",
            stop: "إيقاف التسجيل",
            inpProgress: "التسجيل قيد التقدم",
        },
        desc: {
            needLogin: "يجب أن تكون مسجلاً الدخول للتسجيل.",
            needPremium: "يجب أن تكون عضواً مميزاً للتسجيل.",
            advert: "سيتم إشعار جميع المشاركين بأنك تبدأ تسجيلاً.",
            yourRecordInProgress: "التسجيل قيد التقدم، انقر لإيقافه.",
            inProgress: "التسجيل قيد التقدم",
            notEnabled: "التسجيلات معطلة لهذا العالم.",
        },
    },
};

export default recording;
