import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "Chặn",
        content: "Chặn mọi liên lạc với {userName}. Thao tác này có thể hoàn tác.",
        unblock: "Bỏ chặn người dùng này",
        block: "Chặn người dùng này",
    },
    title: "Báo cáo",
    content: "Gửi báo cáo tới quản trị viên của phòng này. Sau đó họ có thể cấm người dùng này.",
    message: {
        title: "Tin nhắn của bạn: ",
        empty: "Nội dung báo cáo không được để trống.",
        error: "Lỗi khi gửi báo cáo, bạn có thể liên hệ quản trị viên.",
    },
    submit: "Báo cáo người dùng này",
    moderate: {
        title: "Kiểm duyệt {userName}",
        block: "Chặn",
        report: "Báo cáo",
        noSelect: "LỖI: Chưa chọn thao tác nào.",
    },
};

export default report;
