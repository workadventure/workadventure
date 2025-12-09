import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "상태가 정상입니다 ✅",
        offLine: "상태가 오프라인입니다 ❌",
        warning: "상태 경고 ⚠️",
        sync: "상태 동기화 중 🔄",
    },
    teams: {
        openingMeeting: "Teams 회의를 여는 중...",
        unableJoinMeeting: "Teams 회의에 참가할 수 없습니다!",
        userNotConnected: "Outlook 또는 Google 계정과 동기화되지 않았습니다!",
        connectToYourTeams: "Outlook 또는 Google 계정에 연결하세요 🙏",
        temasAppInfo:
            "Teams는 팀이 연결되고 체계적으로 유지되도록 돕는 Microsoft 365 앱입니다. 한곳에서 채팅, 회의, 통화 및 협업을 할 수 있습니다 😍",
        buttonSync: "Teams 동기화 🚀",
        buttonConnect: "Teams 연결 🚀",
    },
    discord: {
        integration: "통합",
        explainText:
            "여기에서 Discord 계정을 연결하면 WorkAdventure 채팅에서 직접 메시지를 받을 수 있습니다. 서버를 동기화하면 포함된 방을 만들고 WorkAdventure 채팅에서 참가하기만 하면 됩니다.",
        login: "Discord에 연결",
        fetchingServer: "Discord 서버를 가져오는 중... 👀",
        qrCodeTitle: "Discord 앱으로 QR 코드를 스캔하여 로그인하세요.",
        qrCodeExplainText:
            "Discord 앱으로 QR 코드를 스캔하여 로그인하세요. QR 코드는 시간 제한이 있으므로 때로는 새로 생성해야 합니다",
        qrCodeRegenerate: "새 QR 코드 받기",
        tokenInputLabel: "Discord 토큰",
        loginToken: "토큰으로 로그인",
        loginTokenExplainText: "Discord 토큰을 입력해야 합니다. Discord 통합을 수행하려면 참조하세요",
        sendDiscordToken: "보내기",
        tokenNeeded: "Discord 토큰을 입력해야 합니다. Discord 통합을 수행하려면 참조하세요",
        howToGetTokenButton: "Discord 로그인 토큰을 얻는 방법",
        loggedIn: "연결됨:",
        saveSync: "저장 및 동기화",
        logout: "로그아웃",
        guilds: "Discord 서버",
        guildExplain: "WorkAdventure 채팅 인터페이스에 추가할 채널을 선택하세요.\n",
    },
    outlook: {
        signIn: "Outlook으로 로그인",
        popupScopeToSync: "Outlook 계정 연결",
        popupScopeToSyncExplainText:
            "캘린더 및/또는 작업을 동기화하려면 Outlook 계정에 연결해야 합니다. 이렇게 하면 WorkAdventure에서 회의 및 작업을 보고 지도에서 직접 참가할 수 있습니다.",
        popupScopeToSyncCalendar: "캘린더 동기화",
        popupScopeToSyncTask: "작업 동기화",
        popupCancel: "취소",
        isSyncronized: "Outlook과 동기화됨",
        popupScopeIsConnectedExplainText: "이미 연결되어 있습니다. 로그아웃하고 다시 연결하려면 버튼을 클릭하세요.",
        popupScopeIsConnectedButton: "로그아웃",
        popupErrorTitle: "⚠️ Outlook 또는 Teams 모듈 동기화 실패",
        popupErrorDescription:
            "Outlook 또는 Teams 모듈 초기화 동기화에 실패했습니다. 연결하려면 다시 연결을 시도하세요.",
        popupErrorContactAdmin: "문제가 계속되면 관리자에게 문의하세요.",
        popupErrorShowMore: "자세한 정보 표시",
        popupErrorMoreInfo1:
            "로그인 프로세스에 문제가 있을 수 있습니다. SSO Azure 공급자가 올바르게 구성되어 있는지 확인하세요.",
        popupErrorMoreInfo2:
            'SSO Azure 공급자에 대해 "offline_access" 범위가 활성화되어 있는지 확인하세요. 이 범위는 새로고침 토큰을 얻고 Teams 또는 Outlook 모듈을 연결 상태로 유지하는 데 필요합니다.',
    },
    google: {
        signIn: "Google로 로그인",
        popupScopeToSync: "Google 계정 연결",
        popupScopeToSyncExplainText:
            "캘린더 및/또는 작업을 동기화하려면 Google 계정에 연결해야 합니다. 이렇게 하면 WorkAdventure에서 회의 및 작업을 보고 지도에서 직접 참가할 수 있습니다.",
        popupScopeToSyncCalendar: "캘린더 동기화",
        popupScopeToSyncTask: "작업 동기화",
        popupCancel: "취소",
        isSyncronized: "Google과 동기화됨",
        popupScopeToSyncMeet: "온라인 회의 만들기",
        openingMeet: "Google Meet를 여는 중... 🙏",
        unableJoinMeet: "Google Meet에 참가할 수 없습니다 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "Google Space를 만드는 중… 몇 초만 걸립니다 💪",
            guestError: "연결되지 않아 Google Meet를 만들 수 없습니다 😭",
            guestExplain: "Google Meet를 만들려면 플랫폼에 로그인하거나 소유자에게 대신 만들어 달라고 요청하세요 🚀",
            error: "Google Workspace 설정에서 Meet를 만들 수 없습니다.",
            errorExplain: "걱정하지 마세요. 다른 사람이 링크를 공유하면 여전히 회의에 참가할 수 있습니다 🙏",
        },
        popupScopeIsConnectedButton: "로그아웃",
        popupScopeIsConnectedExplainText: "이미 연결되어 있습니다. 로그아웃하고 다시 연결하려면 버튼을 클릭하세요.",
    },
    calendar: {
        title: "오늘 회의",
        joinMeeting: "여기를 클릭하여 회의에 참가하세요",
    },
    todoList: {
        title: "할 일",
        sentence: "휴식을 취하세요 🙏 커피나 차 한 잔 어떠세요? ☕",
    },
};

export default externalModule;
