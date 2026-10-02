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
            placeholder: "선택 사항. {userName}님에게 이 메시지가 표시됩니다.",
        },
        adminOnly: "관리자 전용",
        cancel: "취소",
        hint: {
            block: "더 이상 보거나 듣지 않습니다. 나에게만 적용되며 되돌릴 수 있습니다.",
            report: "관리자에게 알립니다.",
            kick: "지금 연결을 끊습니다. 다시 들어올 수 있습니다.",
            ban: "영구적으로 연결을 끊습니다.",
        },
        kick: {
            title: "내보내기",
            content: "{userName}님의 연결이 즉시 끊기며, 나중에 다시 들어올 수 있습니다.",
            submit: "내보내기",
            confirmTitle: "{userName} 내보내기",
        },
        ban: {
            title: "월드에서 차단",
            content: "{userName}님의 연결이 끊기며, 이 계정으로는 이 월드에 다시 참여할 수 없습니다.",
            submit: "차단",
            confirmTitle: "{userName}님을 영구 차단할까요?",
            confirmContent:
                '관리자는 나중에 메뉴의 "차단된 사용자" 페이지(이 월드에 있는 경우) 또는 백오피스에서 차단을 해제할 수 있습니다.',
            scope: {
                account: "이 계정",
                ip: "이 계정과 IP 주소",
                ipHint: "같은 연결에서 만든 새 계정과, 그 연결을 공유하는 모든 사람(사무실, 학교 등)도 차단합니다.",
                ipUnknown: "사용할 수 없음: 이 사용자는 더 이상 접속해 있지 않습니다.",
                ipShared: "사용할 수 없음: 이 IP 주소를 함께 사용하고 있어 본인도 차단됩니다.",
                loading: "이 IP 주소를 공유하는 사람을 확인하는 중…",
                error: "사용할 수 없음: 이 IP 주소를 공유하는 사람을 확인하지 못했습니다.",
                nobody: "지금 이 IP 주소로 이 월드에 접속한 다른 사람은 없습니다. 나중에 이 주소로 돌아오는 사람도 차단됩니다.",
                others: "함께 차단됨, 지금 이 IP 주소로 이 월드에 접속한 사람({count}):",
                submitWithOthers: "이 {count}명 차단",
            },
        },
    },
    kicked: {
        title: "내보내짐",
        subtitle: "중재자가 이 맵에서 회원님을 내보냈습니다",
    },
    banned: {
        title: "차단됨",
        subtitle: "WorkAdventure에서 차단되었습니다",
        details: "자세한 내용은 hello@workadventu.re 로 문의하세요.",
    },
    reasonGiven: "사유: {reason}",
};

export default report;
