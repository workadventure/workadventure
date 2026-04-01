import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    editCam: "카메라 설정",
    editMic: "마이크 설정",
    editSpeaker: "오디오 출력 설정",
    active: "활성화됨",
    disabled: "비활성화됨",
    notRecommended: "권장하지 않음",
    enable: {
        title: "카메라와 마이크를 켜세요",
        start: "오디오 및 비디오 장치 설정 페이지에 오신 것을 환영합니다! 여기에서 온라인 경험을 향상시킬 수 있는 도구를 찾을 수 있습니다. 선호에 맞게 설정을 조정해 잠재적인 문제를 해결하세요. 하드웨어가 올바르게 연결되어 있고 최신 상태인지 확인한 뒤, 나에게 가장 잘 맞는 구성을 찾을 때까지 여러 설정을 탐색하고 테스트해 보세요.",
    },
    help: {
        title: "카메라 / 마이크 접근 권한이 필요합니다",
        permissionDenied: "권한 거부됨",
        content: "브라우저에서 카메라와 마이크 사용을 허용해야 합니다.",
        firefoxContent: 'Firefox가 계속해서 권한을 묻지 않도록 하려면 "이 결정을 기억" 체크박스를 클릭하세요.',
        allow: "웹캠 허용",
        continue: "웹캠 없이 계속하기",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
        tooltip: {
            permissionDeniedTitle: "카메라 액세스 차단됨",
            permissionDeniedDesc:
                "브라우저가 이 사이트의 카메라 액세스를 거부했습니다. 주소 표시줄(자물쇠 또는 카메라 아이콘)이나 사이트 설정에서 허용하세요. 아래 그림은 사용 중인 브라우저에 맞습니다.",
            noDeviceTitle: "사용 가능한 카메라 없음",
            noDeviceDesc:
                "브라우저가 사용할 수 있는 카메라를 찾지 못했습니다. 다른 브라우저를 시도하거나 카메라 연결을 확인하거나, 장치가 정상이라면 컴퓨터를 다시 시작해 보세요.",
            permissionMedia: {
                firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
                chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
                safari: "/resources/help-setting-camera-permission/en-US-firefox.png",
                android: "/resources/help-setting-camera-permission/en-US-firefox.png",
                default: "/resources/help-setting-camera-permission/en-US-firefox.png",
            },
        },
        microphoneTooltip: {
            permissionDeniedTitle: "마이크 액세스 차단됨",
            permissionDeniedDesc:
                "브라우저가 이 사이트의 마이크 액세스를 거부했습니다. 주소 표시줄(자물쇠 또는 마이크 아이콘)이나 사이트 설정에서 허용하세요. 아래 그림은 사용 중인 브라우저에 맞습니다.",
            noDeviceTitle: "사용 가능한 마이크 없음",
            noDeviceDesc:
                "브라우저가 사용할 수 있는 마이크를 찾지 못했습니다. 다른 브라우저를 시도하거나 마이크 연결을 확인하거나, 장치가 정상이라면 컴퓨터를 다시 시작해 보세요.",
            permissionMedia: {
                firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
                chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
                safari: "/resources/help-setting-camera-permission/en-US-firefox.png",
                android: "/resources/help-setting-camera-permission/en-US-firefox.png",
                default: "/resources/help-setting-camera-permission/en-US-firefox.png",
            },
        },
    },
    webrtc: {
        title: "비디오 릴레이 서버 연결 오류",
        titlePending: "비디오 릴레이 서버에 연결 중",
        error: "TURN 서버에 연결할 수 없습니다",
        content: "비디오 릴레이 서버에 연결할 수 없습니다. 다른 사용자와 통신하지 못할 수 있습니다.",
        solutionVpn: "<strong>VPN을 통해 접속 중</strong>이라면 VPN 연결을 끊은 뒤 페이지를 새로고침해 보세요.",
        solutionVpnNotAskAgain: "알겠습니다. 다시는 경고하지 마세요 💡",
        solutionHotspot:
            "제한된 네트워크(회사 네트워크 등)를 사용 중이라면 네트워크를 변경해 보세요. 예를 들어 휴대전화로 <strong>WiFi 핫스팟</strong>을 만든 뒤 그 핫스팟에 연결해 보세요.",
        solutionNetworkAdmin: "<strong>네트워크 관리자</strong>라면 다음 문서를 참고하세요: ",
        preparingYouNetworkGuide: '"네트워크 준비" 가이드',
        refresh: "새로고침",
        continue: "계속하기",
        newDeviceDetected: "새 장치를 발견했습니다: {device} 🎉 전환할까요? [SPACE] 무시 [ESC]",
    },
    my: {
        silentZone: "조용한 구역",
        silentZoneDesc:
            "현재 조용한 구역에 있습니다. 함께 있는 사람들만 보고 들을 수 있으며, 방 안의 다른 사람들은 볼 수도, 들을 수도 없습니다.",
        nameTag: "나",
        loading: "카메라를 불러오는 중입니다...",
    },
    disable: "카메라 끄기",
    menu: {
        moreAction: "추가 작업",
        closeMenu: "메뉴 닫기",
        senPrivateMessage: "비공개 메시지 보내기(곧 제공 예정)",
        kickoffUser: "사용자 내보내기",
        muteAudioUser: "해당 사용자 오디오 음소거",
        askToMuteAudioUser: "오디오 음소거 요청",
        muteAudioEveryBody: "모든 사용자 오디오 음소거",
        muteVideoUser: "해당 사용자 비디오 끄기",
        askToMuteVideoUser: "비디오 끄기 요청",
        muteVideoEveryBody: "모든 사용자 비디오 끄기",
        blockOrReportUser: "관리 / 신고",
    },
    backgroundEffects: {
        imageTitle: "배경 이미지",
        videoTitle: "배경 비디오",
        blurTitle: "배경 흐림 효과",
        resetTitle: "배경 효과 끄기",
        title: "배경 효과",
        close: "닫기",
        blurAmount: "흐림 정도",
    },
};

export default camera;
