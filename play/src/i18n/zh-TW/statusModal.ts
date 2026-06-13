import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "接受",
    close: "關閉",
    confirm: "確認",
    goBackToOnlineStatusLabel: "您想重新上線嗎？",
    allowNotification: "允許通知？",
    allowNotificationExplanation: "當有人想與您交談時，接收桌面通知。",
    soundBlockedBackInAMoment: "您的瀏覽器目前正在封鎖聲音播放，因此您處於「馬上回來」模式。",
    turnSoundOn: "開啟聲音",
};

export default statusModal;
