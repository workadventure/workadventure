import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "Đồng ý",
    close: "Đóng",
    confirm: "Xác nhận",
    goBackToOnlineStatusLabel: "Bạn có muốn trở lại trạng thái trực tuyến không?",
    allowNotification: "Cho phép thông báo?",
    allowNotificationExplanation: "Nhận thông báo trên màn hình khi có người muốn nói chuyện với bạn.",
    audioPlaybackBlocked: "Trình duyệt của bạn đã chặn phát âm thanh.",
    audioPlaybackInterrupted: "Việc phát âm thanh bị trình duyệt hoặc hệ điều hành gián đoạn.",
    turnSoundOn: "Bật âm thanh",
};

export default statusModal;
