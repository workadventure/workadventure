import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "网络连接问题！",
    no_video_stream_received: "未收到视频流。",
    user_is_muted: "{name} 已静音。",
    reduce: "缩小",
    toggle_fullscreen: "切换全屏",
    exit_fullscreen: "退出全屏",
    click_to_unmute: "点击取消静音",
    click_and_drag_to_resize: "单击并拖动以调整大小",
};

export default video;
