import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    volumeCtrl: "Thay đổi âm lượng",
    manager: {
        reduce: "Giảm âm lượng trình phát nhạc khi nói chuyện",
        allow: "Cho phép phát âm thanh",
        error: "Không thể tải âm thanh",
        notAllowed: "▶️ Âm thanh chưa được cho phép. Nhấn [PHÍM CÁCH] hoặc bấm vào đây để phát!",
    },
    message: "Tin nhắn âm thanh",
    disable: "Tắt micrô của bạn",
};

export default audio;
