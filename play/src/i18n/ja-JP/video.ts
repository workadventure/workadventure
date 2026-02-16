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
    click_and_drag_to_resize: "クリックしてドラッグしてサイズを変更",
};

export default video;
