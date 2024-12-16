import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "مشكلة في الاتصال!", // Connection issue!
    no_video_stream_received: "لم يتم استقبال تدفق الفيديو.", // No video stream received.
};

export default video;
