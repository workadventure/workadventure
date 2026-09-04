import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Sự cố kết nối mạng",
    no_video_stream_received: "Không nhận được luồng video.",
    user_is_muted: "{name} đang tắt tiếng.",
    reduce: "Thu nhỏ",
    toggle_fullscreen: "Bật/tắt toàn màn hình",
    exit_fullscreen: "Thoát toàn màn hình",
    connecting: "Đang kết nối...",
    reconnecting: "Đang kết nối lại...",
    persistent_connection_issue: "Đang kết nối lại... Kết nối không ổn định...",
    click_and_drag_to_resize: "Bấm và kéo để thay đổi kích thước",
    click_to_unblock: "Bấm để bỏ chặn",
};

export default video;
