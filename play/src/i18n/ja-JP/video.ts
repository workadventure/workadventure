import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "接続に問題があります。",
    no_video_stream_received: "ビデオストリームが受信できません。",
    user_is_muted: "{name}はミュートされています。",
    reduce: "縮小",
    toggle_fullscreen: "フルスクリーンの切り替え",
    exit_fullscreen: "フルスクリーンを終了",
    click_to_unmute: "クリックしてミュートを解除",
    connecting: "接続中...",
    reconnecting: "再接続中...",
    persistent_connection_issue: "再接続中... 接続が不安定です...",
    click_and_drag_to_resize: "クリックしてドラッグしてサイズを変更",
};

export default video;
