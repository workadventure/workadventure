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
        action: "중재",
        reason: {
            label: "사유",
            placeholder: "선택 사항. 이 월드의 관리자를 위해 보관됩니다.",
        },
        adminOnly: "관리자 전용",
        cancel: "취소",
        hint: {
            block: "더 이상 보거나 듣지 않습니다. 나에게만 적용되며 되돌릴 수 있습니다.",
            report: "이 월드의 관리자에게 알립니다.",
            kick: "지금 연결을 끊습니다. 다시 들어올 수 있습니다.",
            ban: "영구적으로 연결을 끊습니다.",
        },
        kick: {
            title: "맵에서 내보내기",
            content: "{userName}님의 연결이 즉시 끊기며, 나중에 다시 들어올 수 있습니다.",
            submit: "내보내기",
        },
        ban: {
            title: "월드에서 차단",
            content: "{userName}님의 연결이 끊기며, 다른 계정으로도 이 월드에 다시 참여할 수 없습니다.",
            submit: "차단",
            confirmTitle: "{userName}님을 영구 차단할까요?",
            confirmContent: "게임 내에서는 되돌릴 수 없습니다. 관리자만 백오피스에서 차단을 해제할 수 있습니다.",
        },
    },
    kicked: {
        title: "내보내짐",
        subtitle: "중재자가 이 맵에서 회원님을 내보냈습니다",
        details: "다시 참여하려면 페이지를 새로고침하세요.",
    },
    banned: {
        title: "차단됨",
        subtitle: "WorkAdventure에서 차단되었습니다",
        details: "자세한 내용은 hello@workadventu.re 로 문의하세요.",
    },
    reasonGiven: "사유: {reason}",
};

export default report;
