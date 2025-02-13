import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    manager: {
        reduce: "خفض مستوى الصوت أثناء المحادثة", // Reduce the volume of the audio player when speaking
        allow: "تفعيل الصوت", // Allow audio
        error: "فشل في تحميل الملف الصوتي", // Could not load sound
    },
    message: "رسالة صوتية", // Voice message
    disable: "إيقاف الميكروفون", // Disable microphone
};

export default audio;
