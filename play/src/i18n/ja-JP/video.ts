import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "接続に問題があります。",
    no_video_stream_received: "ビデオストリームが受信できません。",
    click_and_drag_to_resize: "クリックしてドラッグしてサイズを変更",
};

export default video;
