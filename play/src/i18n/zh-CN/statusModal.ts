import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "接受",
    close: "关闭",
    confirm: "确认",
    goBackToOnlineStatusLabel: "您想重新上线吗？",
    allowNotification: "允许通知？",
    allowNotificationExplanation: "当有人想与您交谈时，接收桌面通知。",
};

export default statusModal;
