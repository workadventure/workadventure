import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "차단",
        content: "{userName}님과의 모든 통신을 차단합니다. 이 작업은 되돌릴 수 있습니다.",
        unblock: "이 사용자 차단 해제",
        block: "이 사용자 차단",
    },
    title: "신고",
    content: "이 방의 관리자에게 신고 메시지를 보냅니다. 나중에 이 사용자를 금지할 수 있습니다.",
    message: {
        title: "메시지: ",
        empty: "신고 메시지는 비워둘 수 없습니다.",
        error: "신고 메시지 오류입니다. 관리자에게 문의하세요.",
    },
    submit: "이 사용자 신고",
    moderate: {
        title: "{userName}님 중재",
        block: "차단",
        report: "신고",
        noSelect: "오류: 선택된 작업이 없습니다.",
    },
};

export default report;
