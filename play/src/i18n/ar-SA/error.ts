import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const error: DeepPartial<Translation["error"]> = {
    accessLink: {
        title: "رابط الوصول غير صالح", // Invalid access link
        subTitle: "لم يتم العثور على الخريطة. يرجى التحقق من رابط الوصول الخاص بك.", // Map could not be found. Please check your access link.
        details: "لمزيد من المعلومات، يرجى الاتصال بالمسؤولين أو الاتصال بنا على: hello@workadventu.re", // For more information, please contact the administrators or reach out to us at: hello@workadventu.re
    },
    connectionRejected: {
        title: "تم رفض الاتصال", // Connection rejected
        subTitle: "لا يمكنك دخول هذا العالم. حاول مرة أخرى لاحقًا {error}.", // You cannot enter this world. Please try again later {error}.
        details: "لمزيد من المعلومات، يرجى الاتصال بالمسؤولين أو الاتصال بنا على: hello@workadventu.re", // For more information, please contact the administrators or reach out to us at: hello@workadventu.re
    },
    connectionRetry: {
        unableConnect: "تعذر الاتصال بـ WorkAdventure. يرجى التأكد من أنك متصل بالإنترنت.", // Unable to connect to WorkAdventure. Please ensure you are connected to the internet.
    },
    errorDialog: {
        title: "خطأ 😱", // Error 😱
        hasReportIssuesUrl: "لمزيد من المعلومات، يرجى الاتصال بالمسؤولين أو الإبلاغ عن خطأ على:", // For more information, please contact the administrators or report an error at:
        noReportIssuesUrl: "لمزيد من المعلومات، يرجى الاتصال بمسؤولي هذا العالم.", // For more information, please contact the administrators of this world.
        messageFAQ: "يمكنك أيضًا قراءة الأسئلة الشائعة لدينا:", // You can also read our FAQ:
        reload: "إعادة تحميل", // Reload
        close: "إغلاق", // Close
    },
};

export default error;
