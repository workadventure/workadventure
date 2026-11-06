import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "Sự cố kết nối mạng",
    no_video_stream_received: "Không nhận được luồng video.",
    user_is_muted: "{name} đang tắt tiếng.",
    reduce: "Thu nhỏ",
    connecting: "Đang kết nối...",
    reconnecting: "Đang kết nối lại...",
    persistent_connection_issue: "Đang kết nối lại... Kết nối không ổn định...",
    click_and_drag_to_resize: "Bấm và kéo để thay đổi kích thước",
    click_to_unblock: "Bấm để bỏ chặn",
    away: {
        subtitle: "Tạm dừng khi bạn vắng mặt",
        cantSeeOrHear: "Không ai có thể thấy hoặc nghe bạn",
        heardNotSeen: "Mọi người nghe được bạn, nhưng không thấy bạn",
        cantSee: "Không ai có thể thấy bạn",
        seenNotHeard: "Mọi người thấy bạn, nhưng không nghe được bạn",
        cantHear: "Không ai có thể nghe bạn",
        turnOnBoth: "Bật camera và micro",
        turnOnCamera: "Bật camera",
        turnOnMicrophone: "Bật micro",
        turnOn: "Bật",
    },
    remoteAway: {
        inAnotherWindow: "{name} đang ở cửa sổ hoặc tab khác",
        cameraAndMicPaused: "Camera và micro tạm dừng đến khi quay lại",
        cameraPaused: "Camera tạm dừng đến khi quay lại",
        micPaused: "Micro tạm dừng đến khi quay lại",
    },
};

export default video;
