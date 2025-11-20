import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name}님이 대화를 원합니다",
    message: "{name}님이 메시지를 보냅니다",
    chatRoom: "채팅방에서",
    askToMuteMicrophone: "마이크를 음소거할까요?",
    askToMuteCamera: "카메라를 음소거할까요?",
    microphoneMuted: "운영자가 마이크를 음소거했습니다",
    cameraMuted: "운영자가 카메라를 음소거했습니다",
    announcement: "공지사항",
    open: "열기",
    help: {
        title: "알림 접근이 거부됨",
        permissionDenied: "권한이 거부됨",
        content:
            "어떤 대화도 놓치지 마세요. WorkAdventure 탭이 아닌 경우에도 누군가 대화를 원할 때 알림을 받으려면 알림을 활성화하세요.",
        firefoxContent: 'Firefox가 계속 권한을 요청하지 않도록 하려면 "이 결정 기억하기" 체크박스를 클릭하세요.',
        refresh: "새로 고침",
        continue: "알림 없이 계속하기",
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
    addNewTag: "새 태그 추가: '{tag}'",
    screenSharingError: "화면 공유를 시작할 수 없습니다",
};

export default notification;
