import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const error: DeepPartial<Translation["error"]> = {
    accessLink: {
        title: "Liên kết truy cập không đúng",
        subTitle: "Không tìm thấy bản đồ. Vui lòng kiểm tra liên kết truy cập của bạn.",
        details:
            "Nếu cần thêm thông tin, bạn có thể liên hệ quản trị viên hoặc liên hệ chúng tôi tại: hello@workadventu.re",
    },
    connectionRejected: {
        title: "Kết nối bị từ chối",
        subTitle: "Bạn không thể vào thế giới này. Vui lòng thử lại sau {error}.",
        details:
            "Nếu cần thêm thông tin, bạn có thể liên hệ quản trị viên hoặc liên hệ chúng tôi tại: hello@workadventu.re",
    },
    connectionRetry: {
        unableConnect: "Mất kết nối tới máy chủ. Bạn sẽ không thể nói chuyện với những người khác.",
    },
    errorDialog: {
        title: "Lỗi 😱",
        hasReportIssuesUrl: "Nếu cần thêm thông tin, bạn có thể liên hệ quản trị viên hoặc báo lỗi tại:",
        noReportIssuesUrl: "Nếu cần thêm thông tin, bạn có thể liên hệ quản trị viên của thế giới này.",
        messageFAQ: "Bạn cũng có thể xem:",
        reload: "Tải lại",
        close: "Đóng",
    },
};

export default error;
