import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    manager: {
        reduce: "خفض مستوى صوت مشغل الصوت عند التحدث", // Reduce the volume of the audio player when speaking
        allow: "السماح بالصوت", // Allow audio
        error: "تعذر تحميل الصوت", // Could not load sound
    },
    message: "رسالة صوتية", // Voice message
    disable: "تعطيل الميكروفون", // Disable microphone
};

export default audio;
