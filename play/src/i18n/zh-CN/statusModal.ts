import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "接受",
    close: "关闭",
    confirm: "确认",
    goBackToOnlineStatusLabel: "您想重新上线吗？",
    allowNotification: "允许通知？",
    allowNotificationExplanation: "当有人想与您交谈时，接收桌面通知。",
    audioPlaybackBlocked: "您的浏览器阻止了音频播放。",
    audioPlaybackInterrupted: "音频播放已被您的浏览器或操作系统中断。",
    turnSoundOn: "开启声音",
};

export default statusModal;
