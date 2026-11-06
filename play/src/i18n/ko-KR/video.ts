import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "네트워크 연결 문제",
    no_video_stream_received: "비디오 스트림을 받지 못했습니다.",
    user_is_muted: "{name}님이 음소거되었습니다.",
    reduce: "축소",
    connecting: "연결 중...",
    reconnecting: "재연결 중...",
    persistent_connection_issue: "재연결 중... 연결이 불안정합니다...",
    click_to_unblock: "클릭하여 차단 해제",
    click_and_drag_to_resize: "클릭하고 드래그하여 크기 조정",
    away: {
        subtitle: "자리 비움 중 일시 중지됨",
        cantSeeOrHear: "아무도 나를 보거나 들을 수 없습니다",
        heardNotSeen: "소리는 들리지만 모습은 보이지 않습니다",
        cantSee: "아무도 나를 볼 수 없습니다",
        seenNotHeard: "모습은 보이지만 소리는 들리지 않습니다",
        cantHear: "아무도 내 목소리를 들을 수 없습니다",
        turnOnBoth: "카메라와 마이크 켜기",
        turnOnCamera: "카메라 켜기",
        turnOnMicrophone: "마이크 켜기",
        turnOn: "켜기",
    },
};

export default video;
