import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "مشكلة في الاتصال!", // Connection issue!
    no_video_stream_received: "لم يتم استقبال تدفق الفيديو.", // No video stream received.
    user_is_muted: "{name} صامت.",
    reduce: "تقليل",
    toggle_fullscreen: "تبديل ملء الشاشة",
    exit_fullscreen: "الخروج من ملء الشاشة",
    click_to_unmute: "انقر لإلغاء الكتم",
    click_and_drag_to_resize: "انقر واسحب لتغيير الحجم",
};

export default video;
