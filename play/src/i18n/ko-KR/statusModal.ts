import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "수락",
    close: "닫기",
    confirm: "확인",
    goBackToOnlineStatusLabel: "온라인 상태로 돌아가시겠습니까?",
    allowNotification: "알림을 허용하시겠습니까?",
    allowNotificationExplanation: "누군가 대화를 원할 때 데스크톱 알림을 받습니다.",
    audioPlaybackBlocked: "브라우저가 오디오 재생을 차단했습니다.",
    audioPlaybackInterrupted: "브라우저 또는 운영 체제에 의해 오디오 재생이 중단되었습니다.",
    turnSoundOn: "소리 켜기",
};

export default statusModal;
