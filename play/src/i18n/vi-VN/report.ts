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
        action: "Kiểm duyệt",
        reason: {
            label: "Lý do",
            placeholder: "Không bắt buộc. Được lưu cho quản trị viên của thế giới này.",
        },
        adminOnly: "Dành riêng cho quản trị viên",
        cancel: "Hủy",
        hint: {
            block: "Không nhìn và nghe người này nữa. Chỉ áp dụng cho bạn, và có thể hoàn tác.",
            report: "Báo cho quản trị viên của thế giới này.",
            kick: "Ngắt kết nối ngay. Họ có thể quay lại.",
            ban: "Ngắt kết nối vĩnh viễn.",
        },
        kick: {
            title: "Đưa ra khỏi bản đồ",
            content: "{userName} bị ngắt kết nối ngay lập tức, và có thể quay lại sau.",
            submit: "Đưa ra",
        },
        ban: {
            title: "Cấm khỏi thế giới",
            content: "{userName} bị ngắt kết nối và không thể tham gia lại thế giới này, kể cả với tài khoản khác.",
            submit: "Cấm",
            confirmTitle: "Cấm {userName} vĩnh viễn?",
            confirmContent:
                "Không thể hoàn tác từ trong trò chơi. Chỉ quản trị viên mới có thể gỡ lệnh cấm từ back-office.",
        },
    },
    kicked: {
        title: "BỊ ĐƯA RA",
        subtitle: "Một người kiểm duyệt đã đưa bạn ra khỏi bản đồ này",
        details: "Tải lại trang để tham gia lại.",
    },
    banned: {
        title: "BỊ CẤM",
        subtitle: "Bạn đã bị cấm khỏi WorkAdventure",
        details: "Nếu cần thêm thông tin, bạn có thể liên hệ với chúng tôi tại: hello@workadventu.re",
    },
    reasonGiven: "Lý do: {reason}",
};

export default report;
