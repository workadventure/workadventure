import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "수락",
    close: "닫기",
    confirm: "확인",
    goBackToOnlineStatusLabel: "온라인 상태로 돌아가시겠습니까?",
    allowNotification: "알림을 허용하시겠습니까?",
    allowNotificationExplanation: "누군가 대화를 원할 때 데스크톱 알림을 받습니다.",
};

export default statusModal;
