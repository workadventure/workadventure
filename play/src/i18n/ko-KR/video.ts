import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "네트워크 연결 문제",
    no_video_stream_received: "비디오 스트림을 받지 못했습니다.",
    user_is_muted: "{name}님이 음소거되었습니다.",
    reduce: "축소",
    toggle_fullscreen: "전체 화면 전환",
    exit_fullscreen: "전체 화면 종료",
    click_to_unmute: "클릭하여 음소거 해제",
    click_and_drag_to_resize: "클릭하고 드래그하여 크기 조정",
};

export default video;
