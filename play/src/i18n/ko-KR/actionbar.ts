import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    understand: "알겠어요!",
    edit: "편집",
    cancel: "취소",
    close: "닫기",
    login: "로그인",
    map: "맵 빌드",
    profil: "이름 편집",
    startScreenSharing: "화면 공유 시작",
    stopScreenSharing: "화면 공유 중지",
    screenSharingMode: "화면 공유 모드",
    calendar: "캘린더",
    todoList: "할 일 목록",
    woka: "아바타 꾸미기",
    companion: "동반자 추가",
    //megaphone: "Use megaphone",
    test: "내 설정 테스트",
    editCamMic: "카메라 / 마이크 설정",
    allSettings: "모든 설정",
    globalMessage: "전체 메시지 보내기",
    mapEditor: "맵 에디터",
    mapEditorMobileLocked: "모바일 모드에서는 맵 에디터를 사용할 수 없습니다",
    mapEditorLocked: "맵 에디터가 잠겨 있습니다 🔐",
    app: "외부 애플리케이션",
    camera: {
        disabled: "카메라가 비활성화되어 있습니다",
        activate: "카메라 활성화",
        noDevices: "사용 가능한 카메라 장치를 찾을 수 없습니다",
        setBackground: "배경 설정",
        blurEffects: "블러 효과",
        disableBackgroundEffects: "배경 효과 끄기",
        close: "닫기",
    },
    microphone: {
        disabled: "마이크가 비활성화되어 있습니다",
        activate: "마이크 활성화",
        noDevices: "사용 가능한 마이크 장치를 찾을 수 없습니다",
    },
    speaker: {
        disabled: "스피커가 비활성화되어 있습니다",
        activate: "스피커 활성화",
        noDevices: "사용 가능한 스피커 장치를 찾을 수 없습니다",
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
            desc: "아이디어를 공유하거나 대화를 시작해 보세요. 글로 직접 이야기할 수 있습니다. 간단하고 명확하며 효과적입니다.",
        },
        users: {
            title: "사용자 목록 보기",
            desc: "누가 접속해 있는지 확인하고, 명함을 열어 보고, 메시지를 보내거나 한 번의 클릭으로 그들에게 다가가 보세요!",
        },
        emoji: {
            title: "이모티콘 표시",
            desc: "이모티콘 반응을 사용해 한 번의 클릭으로 감정을 표현해 보세요. 탭 한 번이면 충분합니다!",
        },
        audioManager: {
            title: "주변 소리 볼륨",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
            pause: "오디오 일시정지를 위해 여기를 클릭하세요",
            play: "오디오 재생을 위해 여기를 클릭하세요",
            stop: "오디오 중지를 위해 여기를 클릭하세요",
        },
        audioManagerNotAllowed: {
            title: "주변 소리 차단됨",
            desc: "브라우저에서 주변 소리 재생을 차단했습니다. 아이콘을 클릭해 소리 재생을 시작하세요.",
        },
        follow: {
            title: "따라오기 요청",
            desc: "다른 사용자에게 나를 따라오도록 요청할 수 있습니다. 요청이 수락되면 상대방의 Woka가 자동으로 당신을 따라와 자연스러운 연결이 만들어집니다.",
        },
        unfollow: {
            title: "따라가기 중지",
            desc: "언제든지 사용자를 따라가는 것을 중지할 수 있습니다. 그러면 Woka가 더 이상 그 사용자를 따라가지 않아 이동의 자유를 되찾게 됩니다.",
        },
        lock: {
            title: "대화 잠그기",
            desc: "이 기능을 활성화하면 아무도 새로 대화에 참여할 수 없습니다. 이 공간의 주인은 당신이며, 이미 함께 있는 사람만 상호작용할 수 있습니다.",
        },
        mic: {
            title: "마이크 켜기/끄기",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        micDisabledByStatus: {
            title: "마이크 비활성화됨",
            desc: '현재 상태가 "{status}"이기 때문에 마이크가 비활성화되어 있습니다.',
        },
        cam: {
            title: "카메라 켜기/끄기",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        camDisabledByStatus: {
            title: "카메라 비활성화됨",
            desc: '현재 상태가 "{status}"이기 때문에 카메라가 비활성화되어 있습니다.',
        },
        share: {
            title: "화면 공유",
            desc: "다른 사용자와 화면을 공유하고 싶으신가요? 가능합니다! 채팅에 있는 모두에게 화면을 보여줄 수 있고, 전체 화면 또는 특정 창만 선택해 공유할 수도 있습니다.",
        },
        apps: {
            title: "외부 애플리케이션",
            desc: "우리 애플리케이션 안에 있으면서도 외부 애플리케이션을 자유롭게 탐색하여 부드럽고 풍부한 경험을 즐길 수 있습니다.",
        },
        roomList: {
            title: "방 목록",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        calendar: {
            title: "캘린더",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        todolist: {
            title: "할 일 목록",
            desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        },
        pictureInPicture: {
            title: "화면 속 화면",
            descDisabled:
                "죄송합니다. 이 기능은 사용 중인 기기에서 사용할 수 없습니다 ❌. Chrome 또는 Edge와 같은 다른 기기나 브라우저를 사용해 이 기능에 액세스해 보세요.",
            desc: "대화 중에 비디오나 프레젠테이션을 보면서 화면 속 화면 기능을 사용할 수 있습니다. 화면 속 화면 아이콘을 클릭하기만 하면 콘텐츠를 즐길 수 있습니다.",
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
    featureNotAvailable: "이 방에서는 사용할 수 없는 기능입니다 😭",
    issueReport: {
        menuAction: "문제 신고",
        formTitle: "문제 신고",
        emailLabel: "이메일 (선택 사항)",
        nameLabel: "이름 (선택 사항)",
        descriptionLabel: "설명* (필수)",
        descriptionPlaceholder: "어떤 문제가 있었나요? 무엇을 기대하셨나요?",
        submitButtonLabel: "버그 리포트 보내기",
        cancelButtonLabel: "취소",
        confirmButtonLabel: "확인",
        addScreenshotButtonLabel: "스크린샷 추가",
        removeScreenshotButtonLabel: "스크린샷 제거",
        successMessageText: "신고해 주셔서 감사합니다! 최대한 빨리 검토하겠습니다.",
        highlightToolText: "강조",
        hideToolText: "가리기",
        removeHighlightText: "제거",
    },
    personalDesk: {
        label: "내 책상으로 이동",
        unclaim: "내 책상 해제",
        errorNoUser: "사용자 정보를 찾을 수 없습니다",
        errorNotFound: "아직 개인 책상이 없습니다",
        errorMoving: "개인 책상에 도달할 수 없습니다",
        errorUnclaiming: "개인 책상을 해제할 수 없습니다",
    },
};
export default actionbar;
