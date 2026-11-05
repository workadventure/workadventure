import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "مشكلة في الاتصال!", // Connection issue!
    no_video_stream_received: "لم يتم استقبال تدفق الفيديو.", // No video stream received.
    user_is_muted: "{name} صامت.",
    reduce: "تقليل",
    connecting: "جاري الاتصال...",
    reconnecting: "جاري إعادة الاتصال...",
    persistent_connection_issue: "جاري إعادة الاتصال... اتصال غير مستقر...",
    click_to_unblock: "انقر لإلغاء الحظر",
    click_and_drag_to_resize: "انقر واسحب لتغيير الحجم",
    away: {
        subtitle: "متوقف مؤقتًا أثناء غيابك",
        cantSeeOrHear: "لا أحد يمكنه رؤيتك أو سماعك",
        heardNotSeen: "يمكن سماعك، لكن لا يمكن رؤيتك",
        cantSee: "لا أحد يمكنه رؤيتك",
        seenNotHeard: "يمكن رؤيتك، لكن لا يمكن سماعك",
        cantHear: "لا أحد يمكنه سماعك",
        turnOnBoth: "تشغيل الكاميرا والميكروفون",
        turnOnCamera: "تشغيل الكاميرا",
        turnOnMicrophone: "تشغيل الميكروفون",
        turnOn: "تشغيل",
    },
};

export default video;
