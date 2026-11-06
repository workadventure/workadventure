import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    announcement: {
        title: "공지 보내기",
        audience: "누구에게 보낼까요?",
        thisRoom: "이 방",
        wholeWorld: "월드 전체",
        place: "이동할 장소 (선택)",
        noPlace: "장소 없음",
        noPlaceOnMap: "이 맵에는 아직 이름이 있는 구역이 없습니다.",
        preview: "미리 보기",
        sendToRoom: "이 방에 보내기",
        sendToWorld: "월드 전체에 보내기",
        confirmWorld: "월드의 모든 방이 받게 됩니다.",
        confirmSend: "네, 월드 전체에 보내기",
        cancel: "취소",
        sentToRoom: "이 방에 공지를 보냈습니다",
        sentToWorld: "월드 전체에 공지를 보냈습니다",
        join: "{place}(으)로 이동",
        joinMap: "이동",
        placeNotFound: "이 장소는 더 이상 맵에 없습니다.",
        admin: "관리자",
        more: "대기 중인 공지: {count}",
    },
    modal: {
        liveMessage: {
            startMegaphone: "확성기 시작",
            stopMegaphone: "확성기 중지",
            goingToStream: "스트리밍하려는 것",
            yourMicrophone: "마이크",
            yourCamera: "카메라",
            yourScreen: "화면",
            title: "실시간 메시지",
            and: "및",
            toAll: "모든 참가자에게",
            settings: "설정",
        },
    },
};

export default megaphone;
