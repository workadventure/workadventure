import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    understand: "알겠습니다!",
    edit: "편집",
    cancel: "취소",
    close: "닫기",
    login: "로그인",
    map: "빌드",
    profil: "이름 편집",
    startScreenSharing: "화면 공유 시작",
    stopScreenSharing: "화면 공유 중지",
    screenSharingMode: "화면 공유 모드",
    calendar: "달력",
    todoList: "할 일 목록",
    woka: "아바타 커스터마이징",
    companion: "동반자 추가",
    //megaphone: "Use megaphone",
    test: "설정 테스트",
    editCamMic: "카메라 / 마이크 편집",
    allSettings: "모든 설정",
    globalMessage: "전역 메시지 보내기",
    mapEditor: "지도 편집기",
    mapEditorMobileLocked: "지도 편집기는 모바일 모드에서 잠겨 있습니다",
    mapEditorLocked: "지도 편집기가 잠겨 있습니다 🔐",
    app: "타사 애플리케이션",
    camera: {
        disabled: "카메라가 비활성화되었습니다",
        activate: "카메라 활성화",
        noDevices: "카메라 장치를 찾을 수 없습니다",
        setBackground: "배경 설정",
        blurEffects: "흐림 효과",
        disableBackgroundEffects: "배경 효과 비활성화",
        close: "닫기",
    },
    microphone: {
        disabled: "마이크가 비활성화되었습니다",
        activate: "마이크 활성화",
        noDevices: "마이크 장치를 찾을 수 없습니다",
    },
    speaker: {
        disabled: "스피커가 비활성화되었습니다",
        activate: "스피커 활성화",
        noDevices: "스피커 장치를 찾을 수 없습니다",
    },
    status: {
        ONLINE: "온라인",
        AWAY: "자리 비움",
        BACK_IN_A_MOMENT: "곧 돌아옴",
        DO_NOT_DISTURB: "방해 금지",
        BUSY: "바쁨",
        OFFLINE: "오프라인",
        SILENT: "무음",
        JITSI: "회의 중",
        BBB: "회의 중",
        DENY_PROXIMITY_MEETING: "사용 불가",
        SPEAKER: "회의 중",
        LIVEKIT: "회의 중",
        LISTENER: "회의 중",
    },
    subtitle: {
        camera: "카메라",
        microphone: "마이크",
        speaker: "오디오 출력",
    },
    help: {
        chat: {
            title: "텍스트 메시지 보내기",
            desc: "아이디어를 공유하거나 대화를 시작하세요. 직접 작성하세요. 간단하고, 명확하고, 효과적입니다.",
        },
        users: {
            title: "사용자 목록 표시",
            desc: "누가 있는지 확인하고, 명함에 액세스하고, 메시지를 보내거나, 한 번의 클릭으로 다가가세요!",
        },
        emoji: {
            title: "이모티콘 표시",
            desc: "이모티콘 반응을 사용하여 한 번의 클릭으로 기분을 표현하세요. 탭하고 이동하세요!",
        },
        audioManager: {
            title: "주변 소리 볼륨",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        audioManagerNotAllowed: {
            title: "주변 소리 차단됨",
            desc: "브라우저가 주변 소리 재생을 차단했습니다. 아이콘을 클릭하여 소리 재생을 시작하세요.",
        },
        follow: {
            title: "따라가기 요청",
            desc: "사용자에게 따라가기를 요청할 수 있으며, 이 요청이 수락되면 해당 Woka가 자동으로 당신을 따라가서 원활한 연결을 설정합니다.",
        },
        unfollow: {
            title: "따라가기 중지",
            desc: "언제든지 사용자를 따라가는 것을 중지할 수 있습니다. 그러면 Woka가 더 이상 따라가지 않으며 이동의 자유를 되찾게 됩니다.",
        },
        lock: {
            title: "대화 잠금",
            desc: "이 기능을 활성화하면 아무도 대화에 참여할 수 없습니다. 당신은 공간의 주인이며 이미 참석한 사람만 상호작용할 수 있습니다.",
        },
        mic: {
            title: "마이크 활성화/비활성화",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        micDisabledByStatus: {
            title: "마이크 비활성화됨",
            desc: '"{status}" 상태이므로 마이크가 비활성화되었습니다.',
        },
        cam: {
            title: "카메라 활성화/비활성화",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        camDisabledByStatus: {
            title: "카메라 비활성화됨",
            desc: '"{status}" 상태이므로 카메라가 비활성화되었습니다.',
        },
        share: {
            title: "화면 공유",
            desc: "다른 사용자와 화면을 공유하시겠습니까? 할 수 있습니다! 채팅의 모든 사람에게 화면을 보여줄 수 있으며, 전체 화면 또는 특정 창만 공유하도록 선택할 수 있습니다.",
        },
        apps: {
            title: "타사 애플리케이션",
            desc: "원활하고 풍부한 경험을 위해 애플리케이션 내에서 외부 애플리케이션을 자유롭게 탐색할 수 있습니다.",
        },
        roomList: {
            title: "방 목록",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        calendar: {
            title: "달력",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        todolist: {
            title: "할 일 목록",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
    },
    listStatusTitle: {
        enable: "상태 변경",
    },
    externalModule: {
        status: {
            onLine: "상태가 정상입니다 ✅",
            offLine: "상태가 오프라인입니다 ❌",
            warning: "상태 경고 ⚠️",
            sync: "상태 동기화 중 🔄",
        },
    },
    featureNotAvailable: "방에서 사용할 수 없는 기능입니다 😭",
    issueReport: {
        menuAction: "문제 신고",
        formTitle: "문제 신고",
        emailLabel: "이메일 (필수 아님)",
        nameLabel: "이름 (필수 아님)",
        descriptionLabel: "설명* (필수)",
        descriptionPlaceholder: "무엇이 문제인가요? 무엇을 기대했나요?",
        submitButtonLabel: "버그 리포트 보내기",
        cancelButtonLabel: "취소",
        confirmButtonLabel: "확인",
        addScreenshotButtonLabel: "스크린샷 추가",
        removeScreenshotButtonLabel: "스크린샷 제거",
        successMessageText: "신고해 주셔서 감사합니다! 최대한 빨리 검토하겠습니다.",
        highlightToolText: "강조 표시",
        hideToolText: "숨기기",
        removeHighlightText: "제거",
    },
};
export default actionbar;
