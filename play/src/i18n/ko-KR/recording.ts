import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "새로고침",
    title: "녹화 목록",
    noRecordings: "녹화를 찾을 수 없습니다",
    errorFetchingRecordings: "녹화를 가져오는 중 오류가 발생했습니다",
    expireIn: "{days}일{s} 후 만료",
    download: "다운로드",
    close: "닫기",
    ok: "확인",
    recordingList: "녹화",
    contextMenu: {
        openInNewTab: "새 탭에서 열기",
        delete: "삭제",
    },
    notification: {
        deleteNotification: "녹화가 성공적으로 삭제되었습니다",
        deleteFailedNotification: "녹화 삭제에 실패했습니다",
        recordingStarted: "토론 중 한 명이 녹화를 시작했습니다.",
        downloadFailedNotification: "녹화 다운로드에 실패했습니다",
    },
    actionbar: {
        title: {
            start: "녹화 시작",
            stop: "녹화 중지",
            inpProgress: "녹화가 진행 중입니다",
        },
        desc: {
            needLogin: "녹화하려면 로그인해야 합니다.",
            needPremium: "녹화하려면 프리미엄 회원이어야 합니다.",
            advert: "모든 참가자에게 녹화를 시작한다는 알림이 전송됩니다.",
            yourRecordInProgress: "녹화가 진행 중입니다. 클릭하여 중지합니다.",
            inProgress: "녹화가 진행 중입니다",
            notEnabled: "이 월드에서는 녹화가 비활성화되어 있습니다.",
        },
    },
};

export default recording;
