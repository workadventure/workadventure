import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    editCam: "Cài đặt camera",
    editMic: "Cài đặt micrô",
    editSpeaker: "Cài đặt đầu ra âm thanh",
    active: "Đang hoạt động",
    disabled: "Đã tắt",
    notRecommended: "Không khuyến nghị",
    enable: {
        title: "Bật camera và micrô của bạn",
        start: "Chào mừng bạn đến trang cấu hình thiết bị âm thanh và hình ảnh! Tại đây bạn sẽ tìm thấy các công cụ giúp cải thiện trải nghiệm trực tuyến. Hãy điều chỉnh cài đặt theo ý muốn để khắc phục các sự cố có thể gặp. Đảm bảo thiết bị của bạn được kết nối đúng cách và đã cập nhật. Hãy khám phá và thử các cấu hình khác nhau để tìm ra lựa chọn phù hợp nhất với bạn.",
    },
    help: {
        title: "Cần quyền truy cập camera / micrô",
        cameraTitle: "Cần quyền truy cập camera",
        microphoneTitle: "Cần quyền truy cập micrô",
        permissionDenied: "Quyền bị từ chối",
        cameraPermissionDenied: "Quyền truy cập camera bị từ chối",
        microphonePermissionDenied: "Quyền truy cập micrô bị từ chối",
        cameraMicrophonePermissionDenied: "Quyền truy cập camera và micrô bị từ chối",
        content: "Bạn phải cho phép truy cập camera và micrô trong trình duyệt của mình.",
        cameraContent: "Bạn phải cho phép truy cập camera trong trình duyệt của mình.",
        microphoneContent: "Bạn phải cho phép truy cập micrô trong trình duyệt của mình.",
        firefoxContent:
            'Vui lòng đánh dấu ô "Ghi nhớ quyết định này" nếu bạn không muốn Firefox tiếp tục hỏi quyền truy cập.',
        allow: "Cho phép webcam",
        allowMicrophone: "Cho phép micrô",
        allowCameraMicrophone: "Cho phép webcam và micrô",
        continue: "Tiếp tục không cần webcam",
        continueWithoutMicrophone: "Tiếp tục không cần micrô",
        continueCameraMicrophone: "Tiếp tục không cần webcam và micrô",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
        tooltip: {
            permissionDeniedTitle: "Truy cập camera bị chặn",
            permissionDeniedDesc:
                "Trình duyệt của bạn đã từ chối quyền truy cập camera cho trang này. Hãy cho phép từ thanh địa chỉ (biểu tượng ổ khóa hoặc camera) hoặc trong cài đặt trang web. Hình minh họa bên dưới tương ứng với trình duyệt của bạn.",
            noDeviceTitle: "Không có camera khả dụng",
            noDeviceDesc:
                "Trình duyệt của bạn không tìm thấy camera nào có thể dùng. Hãy thử trình duyệt khác, kiểm tra camera đã được kết nối chưa, kiểm tra cài đặt máy tính (quyền riêng tư, thiết bị), hoặc khởi động lại máy nếu thiết bị lẽ ra phải hoạt động.",
            permissionMedia: {
                firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
                chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
                safari: "/resources/help-setting-camera-permission/en-US-firefox.png",
                android: "/resources/help-setting-camera-permission/en-US-firefox.png",
                default: "/resources/help-setting-camera-permission/en-US-firefox.png",
            },
        },
        microphoneTooltip: {
            permissionDeniedTitle: "Truy cập micrô bị chặn",
            permissionDeniedDesc:
                "Trình duyệt của bạn đã từ chối quyền truy cập micrô cho trang này. Hãy cho phép từ thanh địa chỉ (biểu tượng ổ khóa hoặc micrô) hoặc trong cài đặt trang web. Hình minh họa bên dưới tương ứng với trình duyệt của bạn.",
            noDeviceTitle: "Không có micrô khả dụng",
            noDeviceDesc:
                "Trình duyệt của bạn không tìm thấy micrô nào có thể dùng. Hãy thử trình duyệt khác, kiểm tra micrô đã được kết nối chưa, kiểm tra cài đặt máy tính (quyền riêng tư, thiết bị), hoặc khởi động lại máy nếu thiết bị lẽ ra phải hoạt động.",
            permissionMedia: {
                firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
                chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
                safari: "/resources/help-setting-camera-permission/en-US-firefox.png",
                android: "/resources/help-setting-camera-permission/en-US-firefox.png",
                default: "/resources/help-setting-camera-permission/en-US-firefox.png",
            },
        },
    },
    webrtc: {
        title: "Lỗi kết nối máy chủ chuyển tiếp video",
        titlePending: "Đang chờ kết nối máy chủ chuyển tiếp video",
        error: "Không thể kết nối tới máy chủ TURN",
        content:
            "Không thể kết nối tới máy chủ chuyển tiếp video. Bạn có thể sẽ không liên lạc được với những người khác.",
        solutionVpn: "Nếu bạn <strong>đang kết nối qua VPN</strong>, vui lòng ngắt kết nối VPN và tải lại trang.",
        solutionVpnNotAskAgain: "Đã hiểu. Đừng cảnh báo tôi nữa 🫡",
        solutionHotspot:
            "Nếu bạn đang dùng mạng bị hạn chế (mạng công ty...), hãy thử đổi mạng khác. Ví dụ: tạo <strong>điểm phát Wi-Fi</strong> bằng điện thoại rồi kết nối qua điện thoại.",
        solutionNetworkAdmin: "Nếu bạn là <strong>quản trị viên mạng</strong>, hãy xem ",
        preparingYouNetworkGuide: 'hướng dẫn "Chuẩn bị mạng của bạn"',
        refresh: "Tải lại",
        continue: "Tiếp tục",
        newDeviceDetected: "Phát hiện thiết bị mới {device} 🎉 Chuyển sang? [PHÍM CÁCH] Bỏ qua [ESC]",
    },
    my: {
        silentZone: "Khu vực yên lặng",
        silentZoneDesc:
            "Bạn đang ở trong khu vực yên lặng. Bạn chỉ có thể nhìn và nghe những người đi cùng mình, không thể nhìn hoặc nghe những người khác trong phòng.",
        nameTag: "Bạn",
        loading: "Đang tải camera của bạn...",
    },
    disable: "Tắt camera của bạn",
    menu: {
        moreAction: "Thao tác khác",
        closeMenu: "Đóng menu",
        senPrivateMessage: "Gửi tin nhắn riêng (sắp ra mắt)",
        kickoffUser: "Mời người dùng ra khỏi phòng",
        muteAudioUser: "Tắt tiếng",
        askToMuteAudioUser: "Yêu cầu tắt tiếng",
        muteAudioEveryBody: "Tắt tiếng tất cả mọi người",
        muteVideoUser: "Tắt video",
        askToMuteVideoUser: "Yêu cầu tắt video",
        muteVideoEveryBody: "Tắt video của tất cả mọi người",
        blockOrReportUser: "Kiểm duyệt",
    },
    backgroundEffects: {
        imageTitle: "Ảnh nền",
        videoTitle: "Video nền",
        blurTitle: "Làm mờ nền",
        resetTitle: "Tắt hiệu ứng nền",
        title: "Hiệu ứng nền",
        close: "Đóng",
        blurAmount: "Mức độ mờ",
    },
};

export default camera;
