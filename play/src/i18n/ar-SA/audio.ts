import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    volumeCtrl: "تغيير مستوى صوت الصوت",
    manager: {
        reduce: "خفض مستوى الصوت أثناء المحادثة", // Reduce the volume of the audio player when speaking
        allow: "تفعيل الصوت", // Allow audio
        error: "تعذر تحميل الصوت", // Could not load sound
        notAllowed: "▶️ التشغيل التلقائي غير مسموح. اضغط [المسافة] أو انقر هنا للتشغيل!",
    },
    message: "رسالة صوتية", // Voice message
    disable: "إيقاف الميكروفون", // Disable microphone
};

export default audio;
