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
            placeholder: "Không bắt buộc. {userName} sẽ thấy tin nhắn này.",
        },
        adminOnly: "Dành riêng cho quản trị viên",
        cancel: "Hủy",
        hint: {
            block: "Không nhìn và nghe người này nữa. Chỉ áp dụng cho bạn, và có thể hoàn tác.",
            report: "Báo cho quản trị viên.",
            remove: "Cho họ rời cuộc trò chuyện này. Họ vẫn ở trên bản đồ.",
            kick: "Ngắt kết nối ngay. Họ có thể quay lại.",
            ban: "Ngắt kết nối vĩnh viễn.",
        },
        remove: {
            title: "Cho rời cuộc trò chuyện",
            content:
                "{userName} rời cuộc trò chuyện này ngay lập tức và ngừng phát trực tiếp nếu đang phát. Họ vẫn ở trên bản đồ.",
            submit: "Cho rời",
            confirmTitle: "Cho {userName} rời cuộc trò chuyện",
        },
        kick: {
            title: "Đưa ra",
            content: "{userName} bị ngắt kết nối ngay lập tức, và có thể quay lại sau.",
            submit: "Đưa ra",
            confirmTitle: "Đưa {userName} ra",
        },
        ban: {
            title: "Cấm khỏi thế giới",
            content: "{userName} bị ngắt kết nối và không thể tham gia lại thế giới này bằng tài khoản này.",
            submit: "Cấm",
            confirmTitle: "Cấm {userName}?",
            confirmContent:
                'Quản trị viên có thể gỡ lệnh cấm sau đó từ trang "Người dùng bị cấm" trong menu (nếu thế giới này có) hoặc từ back-office.',
            scope: {
                account: "Tài khoản này",
                ip: "Tài khoản này và địa chỉ IP của nó",
                ipHint: "Cũng chặn các tài khoản mới từ cùng kết nối, và mọi người dùng chung kết nối đó (văn phòng, trường học…).",
                ipUnknown: "Không khả dụng: người dùng này không còn kết nối.",
                ipShared: "Không khả dụng: bạn dùng chung địa chỉ IP này và sẽ tự chặn chính mình.",
                loading: "Đang kiểm tra ai dùng chung địa chỉ IP này…",
                error: "Không khả dụng: không thể kiểm tra ai dùng chung địa chỉ IP này.",
                nobody: "Hiện không có ai khác kết nối vào thế giới này từ địa chỉ IP này. Ai quay lại sau từ địa chỉ này cũng sẽ bị chặn.",
                others: "Cũng bị chặn, những người đang kết nối vào thế giới này từ địa chỉ IP này ({count}):",
                submitWithOthers: "Cấm {count} người này",
            },
        },
    },
    kicked: {
        title: "BỊ ĐƯA RA",
        subtitle: "Một người kiểm duyệt đã đưa bạn ra khỏi bản đồ này",
    },
    banned: {
        title: "BỊ CẤM",
        subtitle: "Bạn đã bị cấm khỏi WorkAdventure",
        details: "Nếu cần thêm thông tin, bạn có thể liên hệ với chúng tôi tại: hello@workadventu.re",
    },
    reasonGiven: "Lý do: {reason}",
};

export default report;
