import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const recording: DeepPartial<Translation["recording"]> = {
    refresh: "Tải lại",
    title: "Danh sách bản ghi của bạn",
    noRecordings: "Không có bản ghi nào",
    errorFetchingRecordings: "Đã xảy ra lỗi khi tải danh sách bản ghi",
    expireIn: "Hết hạn sau {days} ngày",
    expiresOn: "Hết hạn vào {date}",
    download: "Tải xuống",
    close: "Đóng",
    recordingList: "Bản ghi",
    viewList: "Xem dạng danh sách",
    viewCards: "Xem dạng thẻ",
    back: "Quay lại",
    actions: "Thao tác",
    contextMenu: {
        openInNewTab: "Mở trong thẻ mới",
        delete: "Xóa",
    },
    notification: {
        deleteNotification: "Đã xóa bản ghi thành công",
        deleteFailedNotification: "Xóa bản ghi thất bại",
        startFailedNotification: "Bắt đầu ghi thất bại",
        stopFailedNotification: "Dừng ghi thất bại",
        recordingStarted: "{name} đã bắt đầu ghi hình.",
        downloadFailedNotification: "Tải bản ghi thất bại",
        recordingComplete: "Ghi hình hoàn tất",
        recordingIsInProgress: "Đang ghi hình",
        unexpectedlyStoppedNotification: "Ghi hình dừng đột ngột",
        recordingSaved: "Bản ghi của bạn đã được lưu thành công.",
        howToAccess: "Để truy cập các bản ghi của bạn:",
        viewRecordings: "Xem bản ghi",
    },
    actionbar: {
        title: {
            start: "Bắt đầu ghi",
            stop: "Dừng ghi",
            inProgress: "Đang có một bản ghi được thực hiện",
        },
        desc: {
            needLogin: "Bạn cần đăng nhập để ghi hình.",
            needPremium: "Bạn cần tài khoản premium để ghi hình.",
            advert: "Tất cả người tham gia sẽ được thông báo rằng bạn bắt đầu ghi hình.",
            yourRecordInProgress: "Đang ghi hình, bấm để dừng.",
            inProgress: "Đang có một bản ghi được thực hiện",
            notEnabled: " Tính năng ghi hình bị tắt trên thế giới này.",
        },
        spacePicker: {
            megaphone: "Ghi loa phóng thanh",
            discussion: "Ghi cuộc thảo luận",
        },
    },
};

export default recording;
