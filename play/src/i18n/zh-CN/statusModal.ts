import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "接受",
    close: "关闭",
    confirm: "确认",
    goBackToOnlineStatusLabel: "您想重新上线吗？",
    allowNotification: "允许通知？",
    allowNotificationExplanation: "当有人想与您交谈时，接收桌面通知。",
    soundBlockedBackInAMoment: "您的浏览器当前正在阻止声音播放，因此您处于“稍后回来”模式。",
    turnSoundOn: "开启声音",
};

export default statusModal;
