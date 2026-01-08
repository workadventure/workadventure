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
};

export default warning;
