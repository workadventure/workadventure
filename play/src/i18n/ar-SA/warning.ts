import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const warning: DeepPartial<Translation["warning"]> = {
    title: "تحذير!", // "Warning!"
    content: `هذا العالم قريب من حد سعته! يمكنك زيادة قدرته <a href="{upgradeLink}" target="_blank">هنا</a>.`, // "This world is close to its capacity limit! You can increase its capacity <a href="{upgradeLink}" target="_blank">here</a>."
    limit: "لقد اقترب هذا العالم من حدود قدرته الاستيعابية!", // "This world is close to its capacity limit!"
    accessDenied: {
        camera: "تم رفض الوصول إلى الكاميرا. انقر هنا للتحقق من أذونات متصفحك.", // "Camera access denied. Click here to check your browser permissions."
        screenSharing: "تم رفض مشاركة الشاشة. انقر هنا للتحقق من أذونات متصفحك.", // "Screen sharing denied. Click here to check your browser permissions."
        teleport: "تفتقر إلى الأذن للانتقال إلى هذا المستخدم.", // "You lack permission to teleport to this user."
        room: "غير مسموح بالدخول. تفتقر إلى الأذن لدخول هذه الغرفة.", // "Access not permitted. You lack permission to enter this room."
    },
    importantMessage: "رسالة هامة", // "Important message"
    connectionLost: "تم فقدان الاتصال. جاري استعادة الاتصال...", // "Connection lost. Reconnecting..."
    connectionLostTitle: "تم فقدان الاتصال", // "Connection lost"
    connectionLostSubtitle: "إعادة الاتصال", // "Reconnecting"
    waitingConnectionTitle: "انتظار الاتصال", // "Waiting for connection"
    waitingConnectionSubtitle: "الاتصال", // "Connecting"
    megaphoneNeeds: "لاستخدام الميكروفون، يجب عليك تفعيل الكاميرا أو الميكروفون أو مشاركة شاشتك.", // "To use the microphone, you must enable the camera or microphone, or share your screen."
    mapEditorShortCut: "حدث خطأ أثناء محاولة فتح محرر الخريطة.", // "An error occurred while trying to open the map editor."
    mapEditorNotEnabled: "محرر الخريطة غير مفعّل في هذا العالم.", // "The map editor is not enabled in this world."
    popupBlocked: {
        title: "تم حظر النوافذ المنبثقة", // "Popup blocked"
        content: "يرجى السماح بالنوافذ المنبثقة لهذا الموقع في إعدادات متصفحك.", // "Please allow popups for this site in your browser settings."
        done: "حسناً", // "Ok"
    },
};

export default warning;
