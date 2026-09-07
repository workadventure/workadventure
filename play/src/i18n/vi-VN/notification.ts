import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const notification: DeepPartial<Translation["notification"]> = {
    discussion: "{name} muốn trò chuyện với bạn",
    message: "{name} đã gửi một tin nhắn",
    chatRoom: "trong phòng trò chuyện",
    askToMuteMicrophone: "Tôi có thể tắt micrô của bạn không?",
    askToMuteCamera: "Tôi có thể tắt camera của bạn không?",
    microphoneMuted: "Micrô của bạn đã bị người điều hành tắt",
    cameraMuted: "Camera của bạn đã bị người điều hành tắt",
    notificationSentToMuteMicrophone: "Đã gửi thông báo yêu cầu {name} tắt micrô",
    notificationSentToMuteCamera: "Đã gửi thông báo yêu cầu {name} tắt camera",
    announcement: "Thông báo chung",
    open: "Mở",
    help: {
        title: "Quyền thông báo bị từ chối",
        permissionDenied: "Quyền bị từ chối",
        content:
            "Đừng bỏ lỡ cuộc trò chuyện nào. Hãy bật thông báo để biết khi có người muốn nói chuyện với bạn, kể cả khi bạn không ở trên thẻ WorkAdventure.",
        firefoxContent:
            'Vui lòng đánh dấu ô "Ghi nhớ quyết định này" nếu bạn không muốn Firefox tiếp tục hỏi quyền truy cập.',
        refresh: "Tải lại",
        continue: "Tiếp tục không cần thông báo",
        screen: {
            firefox: "/resources/help-setting-notification-permission/en-US-chrome.png",
            chrome: "/resources/help-setting-notification-permission/en-US-chrome.png",
        },
    },
    addNewTag: "thêm nhãn mới: '{tag}'",
    screenSharingError: "Không thể bắt đầu chia sẻ màn hình",
    recordingStarted: "Một người trong cuộc trò chuyện đã bắt đầu ghi hình.",
    urlCopiedToClipboard: "Đã sao chép liên kết vào bộ nhớ tạm",
};

export default notification;
