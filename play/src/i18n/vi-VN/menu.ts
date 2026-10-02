import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    title: "Menu",
    icon: {
        open: {
            menu: "Mở menu",
            invite: "Hiện lời mời",
            register: "Đăng ký",
            chat: "Mở trò chuyện",
            userlist: "Danh sách người dùng",
            openEmoji: "Mở cửa sổ chọn biểu tượng cảm xúc",
            closeEmoji: "Đóng menu biểu tượng cảm xúc",
            mobile: "Mở menu di động",
            calendar: "Lịch",
            todoList: "Danh sách việc cần làm",
        },
    },
    visitCard: {
        close: "Đóng",
        sendMessage: "Gửi tin nhắn",
    },
    profile: {
        login: "Đăng nhập",
        logout: "Đăng xuất",
        helpAndTips: "Trợ giúp & mẹo",
    },
    settings: {
        videoBandwidth: {
            title: "Chất lượng video",
            low: "Thấp",
            recommended: "Khuyến nghị",
            high: "Cao",
        },
        shareScreenBandwidth: {
            title: "Chất lượng chia sẻ màn hình",
            low: "Thấp",
            recommended: "Khuyến nghị",
            high: "Cao",
        },
        bandwidthConstrainedPreference: {
            title: "Khi băng thông mạng bị hạn chế",
            maintainFramerateTitle: "Giữ chuyển động mượt",
            maintainFramerateDescription:
                "Ưu tiên tốc độ khung hình hơn độ phân giải. Dùng khi chuyển động mượt là quan trọng, ví dụ khi phát trực tiếp trò chơi.",
            maintainResolutionTitle: "Giữ chữ dễ đọc",
            maintainResolutionDescription:
                "Ưu tiên độ phân giải hơn tốc độ khung hình. Dùng khi việc đọc chữ là quan trọng, ví dụ trong bài thuyết trình hoặc khi chia sẻ mã nguồn.",
            balancedTitle: "Cân bằng khung hình và độ phân giải",
            balancedDescription: "Cố gắng giữ cân bằng giữa tốc độ khung hình và độ phân giải.",
        },
        microphone: {
            title: "Cài đặt micrô",
            autoGainControl: "Tự động điều chỉnh âm lượng",
            autoGainControlDescription: "Tự động điều chỉnh âm lượng micrô của bạn.",
            echoCancellation: "Khử tiếng vọng",
            enableAdvancedNoiseReduction: "Bật khử tiếng ồn nâng cao",
            noiseSuppressionMode: "Chế độ khử tiếng ồn:",
            workAdventureNoiseSuppression: "Khử tiếng ồn WorkAdventure",
            workAdventureNoiseSuppressionDescription: "Xử lý micrô của bạn bằng bộ khử tiếng ồn của WorkAdventure.",
            recommended: "Khuyến nghị",
            browserNoiseSuppression: "Khử tiếng ồn của trình duyệt",
            browserNoiseSuppressionDescription: "Dùng bộ khử tiếng ồn tích hợp của trình duyệt.",
            voiceIsolation: "Tách giọng nói",
            voiceIsolationDescription: "Dùng tính năng tách giọng nói của trình duyệt và hệ điều hành khi khả dụng.",
        },
        language: {
            title: "Ngôn ngữ",
        },
        privacySettings: {
            title: "Chế độ vắng mặt",
            explanation:
                'Khi thẻ WorkAdventure trong trình duyệt không hiển thị, WorkAdventure chuyển sang "chế độ vắng mặt"',
            cameraToggle: 'Giữ camera hoạt động trong "chế độ vắng mặt"',
            microphoneToggle: 'Giữ micrô hoạt động trong "chế độ vắng mặt"',
        },
        save: "Lưu",
        otherSettings: "Tất cả cài đặt",
        fullscreen: "Toàn màn hình",
        notifications: "Thông báo",
        enablePictureInPicture: "Bật hình trong hình",
        chatSounds: "Âm thanh trò chuyện",
        cowebsiteTrigger: "Luôn hỏi trước khi mở trang web và phòng Jitsi Meet",
        ignoreFollowRequest: "Bỏ qua lời mời đi theo người dùng khác",
        proximityDiscussionVolume: "Âm lượng thảo luận lân cận",
        blockAudio: "Chặn âm thanh môi trường và nhạc",
        disableAnimations: "Tắt hoạt ảnh bản đồ",
        bubbleSound: "Âm thanh bong bóng",
        bubbleSoundOptions: {
            ding: "Ding",
            wobble: "Wobble",
        },
        displayVideoQualityStats: "Hiển thị thống kê chất lượng video",
    },
    invite: {
        description: "Chia sẻ liên kết của phòng!",
        copy: "Sao chép",
        copied: "Đã sao chép",
        share: "Chia sẻ",
        walkAutomaticallyToPosition: "Tự động đi tới vị trí của tôi",
        selectEntryPoint: "Dùng một điểm vào khác",
        selectEntryPointSelect: "Chọn điểm vào mà người dùng sẽ xuất hiện",
    },
    globalMessage: {
        text: "Văn bản",
        audio: "Âm thanh",
        warning: "Phát tới tất cả các phòng của thế giới",
        enter: "Nhập tin nhắn của bạn tại đây...",
        send: "Gửi",
    },
    globalAudio: {
        uploadInfo: "Tải lên một tệp",
        error: "Chưa chọn tệp. Bạn cần tải lên một tệp trước khi gửi.",
        errorUpload:
            "Lỗi tải tệp lên. Vui lòng kiểm tra tệp và thử lại. Nếu sự cố vẫn tiếp diễn, hãy liên hệ quản trị viên.",
        dragAndDrop: "Kéo thả hoặc bấm vào đây để tải tệp của bạn lên 🎧",
    },
    contact: {
        gettingStarted: {
            title: "Bắt đầu",
            description:
                "WorkAdventure cho phép bạn tạo một không gian trực tuyến để giao tiếp tự nhiên với người khác. Và mọi thứ bắt đầu bằng việc tạo không gian của riêng bạn. Hãy chọn trong bộ sưu tập lớn các bản đồ dựng sẵn của đội ngũ chúng tôi.",
        },
        createMap: {
            title: "Tạo bản đồ của bạn",
            description:
                "Bạn cũng có thể tạo bản đồ tùy chỉnh của riêng mình bằng cách làm theo các bước trong tài liệu.",
        },
    },
    about: {
        mapInfo: "Thông tin về bản đồ",
        mapLink: "liên kết tới bản đồ này",
        copyrights: {
            map: {
                title: "Bản quyền của bản đồ",
                empty: "Người tạo bản đồ không khai báo bản quyền cho bản đồ.",
            },
            tileset: {
                title: "Bản quyền của các bộ tile",
                empty: "Người tạo bản đồ không khai báo bản quyền cho các bộ tile. Điều này không có nghĩa là các bộ tile đó không có giấy phép.",
            },
            audio: {
                title: "Bản quyền của các tệp âm thanh",
                empty: "Người tạo bản đồ không khai báo bản quyền cho các tệp âm thanh. Điều này không có nghĩa là các tệp âm thanh đó không có giấy phép.",
            },
        },
    },
    chat: {
        matrixIDLabel: "Matrix ID của bạn",
        settings: "Cài đặt",
        resetKeyStorageUpButtonLabel: "Đặt lại kho khóa của bạn",
        resetKeyStorageConfirmationModal: {
            title: "Xác nhận đặt lại kho khóa",
            content: "Bạn sắp đặt lại kho khóa. Bạn có chắc không?",
            warning:
                "Đặt lại kho khóa sẽ xóa phiên hiện tại của bạn và tất cả người dùng tin cậy. Bạn có thể mất quyền truy cập một số tin nhắn cũ, và sẽ không còn được nhận diện là người dùng tin cậy. Hãy chắc chắn bạn hiểu rõ hậu quả của thao tác này trước khi tiếp tục.",
            cancel: "Hủy",
            continue: "Tiếp tục",
        },
    },
    sub: {
        profile: "Hồ sơ",
        settings: "Cài đặt",
        credit: "Ghi công",
        globalMessages: "Thông báo toàn cầu",
        contact: "Liên hệ",
        report: "Báo lỗi",
        chat: "Trò chuyện",
        help: "Trợ giúp & hướng dẫn",
        contextualActions: "Thao tác theo ngữ cảnh",
        shortcuts: "Phím tắt",
    },
    shortcuts: {
        title: "Phím tắt",
        keys: "Phím tắt",
        actions: "Thao tác",
        moveUp: "Đi lên",
        moveDown: "Đi xuống",
        moveLeft: "Sang trái",
        moveRight: "Sang phải",
        speedUp: "Chạy",
        interact: "Tương tác",
        follow: "Đi theo",
        openChat: "Mở trò chuyện",
        openUserList: "Mở danh sách người dùng",
        toggleMapEditor: "Hiện/ẩn trình chỉnh sửa bản đồ",
        rotatePlayer: "Xoay nhân vật",
        emote1: "Biểu cảm 1",
        emote2: "Biểu cảm 2",
        emote3: "Biểu cảm 3",
        emote4: "Biểu cảm 4",
        emote5: "Biểu cảm 5",
        emote6: "Biểu cảm 6",
        openSayPopup: "Mở cửa sổ Nói",
        openThinkPopup: "Mở cửa sổ Nghĩ",
        walkMyDesk: "Đi tới bàn của tôi",
    },
};

export default menu;
