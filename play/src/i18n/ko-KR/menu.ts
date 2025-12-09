import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    title: "메뉴",
    icon: {
        open: {
            menu: "메뉴 열기",
            invite: "초대 표시",
            register: "등록",
            chat: "채팅 열기",
            userlist: "사용자 목록",
            openEmoji: "선택한 이모티콘 팝업 열기",
            closeEmoji: "이모티콘 메뉴 닫기",
            mobile: "모바일 메뉴 열기",
            calendar: "달력",
            todoList: "할 일 목록",
        },
    },
    visitCard: {
        close: "닫기",
        sendMessage: "메시지 보내기",
    },
    profile: {
        login: "로그인",
        logout: "로그아웃",
    },
    settings: {
        videoBandwidth: {
            title: "비디오 품질",
            low: "낮음",
            recommended: "권장",
            unlimited: "무제한",
        },
        shareScreenBandwidth: {
            title: "화면 공유 품질",
            low: "낮음",
            recommended: "권장",
            unlimited: "무제한",
        },
        language: {
            title: "언어",
        },
        privacySettings: {
            title: "자리 비움 모드",
            explanation: '브라우저에서 WorkAdventure 탭이 보이지 않을 때 WorkAdventure는 "자리 비움 모드"로 전환됩니다',
            cameraToggle: '"자리 비움 모드"에서 카메라 활성 상태 유지',
            microphoneToggle: '"자리 비움 모드"에서 마이크 활성 상태 유지',
        },
        save: "저장",
        otherSettings: "모든 설정",
        fullscreen: "전체 화면",
        notifications: "알림",
        enablePictureInPicture: "PIP(화면 속 화면) 활성화",
        chatSounds: "채팅 소리",
        cowebsiteTrigger: "웹사이트 및 Jitsi Meet 방을 열기 전에 항상 물어보기",
        ignoreFollowRequest: "다른 사용자를 따라가는 요청 무시",
        proximityDiscussionVolume: "근접 대화 볼륨",
        blockAudio: "주변 소리 및 음악 차단",
        disableAnimations: "지도 애니메이션 비활성화",
        bubbleSound: "말풍선 소리",
        bubbleSoundOptions: {
            ding: "딩",
            wobble: "우블",
        },
    },
    invite: {
        description: "방 링크를 공유하세요!",
        copy: "복사",
        copied: "복사됨",
        share: "공유",
        walkAutomaticallyToPosition: "내 위치로 자동으로 걷기",
        selectEntryPoint: "다른 진입 지점 사용",
        selectEntryPointSelect: "사용자가 도착할 진입 지점을 선택하세요",
    },
    globalMessage: {
        text: "텍스트",
        audio: "오디오",
        warning: "월드의 모든 방에 브로드캐스트",
        enter: "여기에 메시지를 입력하세요...",
        send: "보내기",
    },
    globalAudio: {
        uploadInfo: "파일 업로드",
        error: "파일이 선택되지 않았습니다. 보내기 전에 파일을 업로드해야 합니다.",
        errorUpload: "파일 업로드 오류입니다. 파일을 확인하고 다시 시도하세요. 문제가 지속되면 관리자에게 문의하세요.",
        dragAndDrop: "파일을 드래그 앤 드롭하거나 여기를 클릭하여 업로드하세요 🎧",
    },
    contact: {
        gettingStarted: {
            title: "시작하기",
            description:
                "WorkAdventure를 사용하면 다른 사람들과 자발적으로 소통할 수 있는 온라인 공간을 만들 수 있습니다. 모든 것은 자신만의 공간을 만드는 것에서 시작됩니다. 저희 팀이 제작한 다양한 사전 제작 지도 중에서 선택하세요.",
        },
        createMap: {
            title: "지도 만들기",
            description: "문서의 단계를 따라 자신만의 사용자 정의 지도를 만들 수도 있습니다.",
        },
    },
    about: {
        mapInfo: "지도 정보",
        mapLink: "이 지도의 링크",
        copyrights: {
            map: {
                title: "지도 저작권",
                empty: "지도 제작자가 지도에 대한 저작권을 선언하지 않았습니다.",
            },
            tileset: {
                title: "타일셋 저작권",
                empty: "지도 제작자가 타일셋에 대한 저작권을 선언하지 않았습니다. 이것이 타일셋에 라이선스가 없다는 것을 의미하지는 않습니다.",
            },
            audio: {
                title: "오디오 파일 저작권",
                empty: "지도 제작자가 오디오 파일에 대한 저작권을 선언하지 않았습니다. 이것이 오디오 파일에 라이선스가 없다는 것을 의미하지는 않습니다.",
            },
        },
    },
    chat: {
        matrixIDLabel: "Matrix ID",
        settings: "설정",
        resetKeyStorageUpButtonLabel: "키 저장소 재설정",
        resetKeyStorageConfirmationModal: {
            title: "키 저장소 재설정 확인",
            content: "키 저장소를 재설정하려고 합니다. 확실합니까?",
            warning:
                "키 저장소를 재설정하면 현재 세션과 모든 신뢰할 수 있는 사용자가 제거됩니다. 일부 과거 메시지에 대한 액세스 권한을 잃을 수 있으며 더 이상 신뢰할 수 있는 사용자로 인식되지 않습니다. 계속하기 전에 이 작업의 결과를 완전히 이해했는지 확인하세요.",
            cancel: "취소",
            continue: "계속하기",
        },
    },
    sub: {
        profile: "프로필",
        settings: "설정",
        invite: "공유",
        credit: "크레딧",
        globalMessages: "전역 메시지",
        contact: "연락처",
        report: "문제 신고",
        chat: "채팅",
        help: "도움말 및 튜토리얼",
        contextualActions: "컨텍스트 작업",
        shortcuts: "단축키",
    },
    shortcuts: {
        title: "키보드 단축키",
        keys: "단축키",
        actions: "작업",
        moveUp: "위로 이동",
        moveDown: "아래로 이동",
        moveLeft: "왼쪽으로 이동",
        moveRight: "오른쪽으로 이동",
        speedUp: "달리기",
        interact: "상호작용",
        follow: "따라가기",
        openChat: "채팅 열기",
        openUserList: "사용자 목록 열기",
        toggleMapEditor: "지도 편집기 표시/숨기기",
        rotatePlayer: "플레이어 회전",
        emote1: "이모트 1",
        emote2: "이모트 2",
        emote3: "이모트 3",
        emote4: "이모트 4",
        emote5: "이모트 5",
        emote6: "이모트 6",
        openSayPopup: "말하기 팝업 열기",
        openThinkPopup: "생각하기 팝업 열기",
    },
};

export default menu;
