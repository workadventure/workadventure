import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "網路連線問題！",
    no_video_stream_received: "未收到視訊串流。",
    user_is_muted: "{name} 已靜音。",
    reduce: "縮小",
    toggle_fullscreen: "切換全螢幕",
    exit_fullscreen: "退出全螢幕",
    connecting: "連線中...",
    reconnecting: "重新連線中...",
    persistent_connection_issue: "重新連線中... 連線不穩定...",
    click_to_unblock: "點選解除封鎖",
    click_and_drag_to_resize: "點選並拖曳以調整大小",
};

export default video;
