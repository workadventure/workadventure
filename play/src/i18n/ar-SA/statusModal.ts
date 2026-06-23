import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "قبول", // Accept
    close: "إغلاق", // Close
    confirm: "تأكيد", // Confirm
    goBackToOnlineStatusLabel: "هل تريد العودة إلى الوضع المتصل؟", // Do you want to go back online?
    allowNotification: "هل تريد السماح بالإشعارات؟", // Do you want to allow notifications?
    allowNotificationExplanation: "احصل على إشعار سطح المكتب عندما يريد شخص ما التحدث إليك.",
    audioPlaybackBlocked: "منع متصفحك تشغيل الصوت.",
    audioPlaybackInterrupted: "تمت مقاطعة تشغيل الصوت بواسطة المتصفح أو نظام التشغيل.",
    turnSoundOn: "تشغيل الصوت",
};

export default statusModal;
