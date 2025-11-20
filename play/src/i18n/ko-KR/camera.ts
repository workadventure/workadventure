import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    editCam: "카메라 편집",
    editMic: "마이크 편집",
    editSpeaker: "오디오 출력 편집",
    active: "활성화",
    disabled: "비활성화",
    notRecommended: "권장하지 않음",
    enable: {
        title: "카메라와 마이크를 켜세요",
        start: "오디오 및 비디오 장치 구성 페이지에 오신 것을 환영합니다! 온라인 경험을 향상시키는 도구를 여기에서 찾을 수 있습니다. 설정을 원하는 대로 조정하여 잠재적인 문제를 해결하세요. 하드웨어가 올바르게 연결되어 있고 최신 상태인지 확인하세요. 여러 구성을 탐색하고 테스트하여 가장 적합한 것을 찾으세요.",
    },
    help: {
        title: "카메라 / 마이크 접근 필요",
        permissionDenied: "권한이 거부됨",
        content: "브라우저에서 카메라와 마이크 접근을 허용해야 합니다.",
        firefoxContent: 'Firefox가 계속 권한을 요청하지 않도록 하려면 "이 결정 기억하기" 체크박스를 클릭하세요.',
        allow: "웹캠 허용",
        continue: "웹캠 없이 계속하기",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
    },
    webrtc: {
        title: "비디오 릴레이 서버 연결 오류",
        titlePending: "비디오 릴레이 서버 연결 대기 중",
        error: "TURN 서버에 연결할 수 없습니다",
        content: "비디오 릴레이 서버에 연결할 수 없습니다. 다른 사용자와 통신할 수 없을 수 있습니다.",
        solutionVpn: "<strong>VPN을 통해 연결</strong>하는 경우 VPN에서 연결을 끊고 웹 페이지를 새로 고침하세요.",
        solutionVpnNotAskAgain: "알겠습니다. 다시 경고하지 마세요 🫡",
        solutionHotspot:
            "제한된 네트워크(회사 네트워크 등)에 있는 경우 네트워크를 전환해 보세요. 예를 들어 휴대전화로 <strong>WiFi 핫스팟</strong>을 만들어 휴대전화를 통해 연결하세요.",
        solutionNetworkAdmin: "<strong>네트워크 관리자</strong>인 경우 다음을 검토하세요. ",
        preparingYouNetworkGuide: '"네트워크 준비" 가이드',
        refresh: "새로 고침",
        continue: "계속하기",
        newDeviceDetected: "새 장치 감지됨 {device} 🎉 전환하시겠습니까? [SPACE]",
    },
    my: {
        silentZone: "조용한 구역",
        silentZoneDesc:
            "조용한 구역에 있습니다. 함께 있는 사람만 보고 들을 수 있습니다. 방에 있는 다른 사람들을 보거나 들을 수 없습니다.",
        nameTag: "나",
        loading: "카메라를 불러오는 중...",
    },
    disable: "카메라 끄기",
    menu: {
        moreAction: "더 많은 작업",
        closeMenu: "메뉴 닫기",
        senPrivateMessage: "비공개 메시지 보내기 (곧 제공)",
        kickoffUser: "사용자 내보내기",
        muteAudioUser: "오디오 음소거",
        muteAudioEveryBody: "모든 사람 오디오 음소거",
        muteVideoUser: "비디오 음소거",
        muteVideoEveryBody: "모든 사람 비디오 음소거",
        blockOrReportUser: "중재",
    },
    backgroundEffects: {
        imageTitle: "배경 이미지",
        videoTitle: "배경 비디오",
        blurTitle: "배경 흐림",
        resetTitle: "배경 효과 비활성화",
        title: "배경 효과",
        close: "닫기",
        blurAmount: "흐림 정도",
    },
};

export default camera;
