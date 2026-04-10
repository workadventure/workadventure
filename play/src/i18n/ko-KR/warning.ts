import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const warning: DeepPartial<Translation["warning"]> = {
    title: "경고!",
    content: `이 월드는 한계에 가깝습니다! 용량은 <a href="{upgradeLink}" target="_blank">여기</a>에서 업그레이드할 수 있습니다`,
    limit: "이 월드는 한계에 가깝습니다!",
    accessDenied: {
        camera: "카메라 접근이 거부되었습니다. 여기를 클릭하여 브라우저 권한을 확인하세요.",
        screenSharing: "화면 공유가 거부되었습니다. 여기를 클릭하여 브라우저 권한을 확인하세요.",
        teleport: "이 사용자에게 순간이동할 권한이 없습니다.",
        room: "방 접근이 거부되었습니다. 이 방에 들어갈 수 없습니다.",
    },
    importantMessage: "중요한 메시지",
    connectionLost: "연결이 끊어졌습니다. 다시 연결 중...",
    connectionLostTitle: "연결이 끊어짐",
    connectionLostSubtitle: "다시 연결 중",
    waitingConnectionTitle: "연결 대기 중",
    waitingConnectionSubtitle: "연결 중",
    megaphoneNeeds: "확성기를 사용하려면 카메라나 마이크를 활성화하거나 화면을 공유해야 합니다.",
    mapEditorShortCut: "지도 편집기를 여는 동안 오류가 발생했습니다.",
    mapEditorNotEnabled: "이 월드에서는 지도 편집기가 활성화되지 않았습니다.",
    popupBlocked: {
        title: "팝업 차단됨",
        content: "브라우저 설정에서 이 웹사이트의 팝업을 허용하세요.",
        done: "확인",
    },
    backgroundProcessing: {
        failedToApply: "배경 효과 적용에 실패했습니다",
    },
    duplicateUserConnected: {
        title: "이미 연결됨",
        message:
            "이 사용자는 이미 다른 탭 또는 기기에서 이 방에 연결되어 있습니다. 충돌을 피하려면 다른 탭이나 창을 닫아 주세요.",
        confirmContinue: "이해했습니다, 계속",
        dontRemindAgain: "이 메시지를 다시 표시하지 않음",
    },
    browserNotSupported: {
        title: "😢 지원되지 않는 브라우저",
        message: "사용 중인 브라우저({browserName})는 더 이상 WorkAdventure에서 지원되지 않습니다.",
        description:
            "사용 중인 브라우저가 WorkAdventure를 실행하기에는 너무 오래되었습니다. 계속하려면 최신 버전으로 업데이트하세요.",
        whatToDo: "무엇을 할 수 있나요?",
        option1: "{browserName}을 최신 버전으로 업데이트",
        option2: "WorkAdventure를 종료하고 다른 브라우저 사용",
        updateBrowser: "브라우저 업데이트",
        leave: "종료",
    },
    pwaInstall: {
        title: "WorkAdventure 설치",
        description:
            "더 나은 경험을 위해 앱을 설치하세요. 빠른 접근, 시작 시 자동 실행, 앱과 같은 사용 경험을 제공합니다.",
        descriptionIos: "더 나은 경험과 빠른 접근을 위해 WorkAdventure를 홈 화면에 추가하세요.",
        feature1Title: "빠른 접근",
        feature1Description: "시작 메뉴, Dock 또는 데스크톱에서 WorkAdventure를 실행하세요.",
        feature2Title: "전용 앱 창",
        feature2Description: "WorkAdventure를 브라우저 탭과 분리해 두고 작업 표시줄에서 한눈에 찾으세요.",
        feature3Title: "컴퓨터와 함께 시작",
        feature3Description: "기기가 시작될 때 WorkAdventure를 실행하세요.",
        iosStepsTitle: "설치 방법",
        iosStep1: "Safari 하단의 공유 버튼(화살표가 있는 사각형)을 탭하세요.",
        iosStep2: '아래로 스크롤하여 "홈 화면에 추가"를 탭하세요.',
        iosStep3: '"추가"를 탭하여 확인하세요.',
        install: "WorkAdventure 앱 설치",
        installing: "설치 중…",
        skip: "브라우저에서 계속",
        continue: "브라우저에서 계속",
        neverShowPage: "다시 묻지 않기",
    },
};

export default warning;
