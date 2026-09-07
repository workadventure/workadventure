import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const warning: DeepPartial<Translation["warning"]> = {
    title: "Cảnh báo!",
    content: `Thế giới này sắp đạt giới hạn! Bạn có thể nâng cấp dung lượng <a href="{upgradeLink}" target="_blank">tại đây</a>`,
    limit: "Thế giới này sắp đạt giới hạn!",
    accessDenied: {
        camera: "Quyền truy cập camera bị từ chối. Bấm vào đây và kiểm tra quyền trong trình duyệt của bạn.",
        screenSharing: "Chia sẻ màn hình bị từ chối. Bấm vào đây và kiểm tra quyền trong trình duyệt của bạn.",
        teleport: "Bạn không có quyền dịch chuyển tới người dùng này.",
        room: "Truy cập phòng bị từ chối. Bạn không được phép vào phòng này.",
    },
    importantMessage: "Thông báo quan trọng",
    connectionLost: "Mất kết nối. Đang kết nối lại...",
    connectionLostTitle: "Mất kết nối",
    connectionLostSubtitle: "Đang kết nối lại",
    waitingConnectionTitle: "Đang chờ kết nối",
    waitingConnectionSubtitle: "Đang kết nối",
    megaphoneNeeds: "Để dùng loa phóng thanh, bạn phải bật camera hoặc micrô, hoặc chia sẻ màn hình.",
    mapEditorShortCut: "Đã xảy ra lỗi khi mở trình chỉnh sửa bản đồ.",
    mapEditorNotEnabled: "Trình chỉnh sửa bản đồ chưa được bật trên thế giới này.",
    popupBlocked: {
        title: "Cửa sổ bật lên bị chặn",
        content: "Vui lòng cho phép cửa sổ bật lên cho trang web này trong cài đặt trình duyệt của bạn.",
        done: "Ok",
    },
    backgroundProcessing: {
        failedToApply: "Không thể áp dụng hiệu ứng nền",
    },
    duplicateUserConnected: {
        title: "Đã kết nối ở nơi khác",
        message:
            "Bạn đã kết nối vào phòng này từ một thẻ hoặc thiết bị khác. Để tránh xung đột, vui lòng đóng thẻ hoặc cửa sổ kia.",
        confirmContinue: "Tôi hiểu, tiếp tục",
        dontRemindAgain: "Không hiển thị thông báo này nữa",
    },
    browserNotSupported: {
        title: "😢 Trình duyệt không được hỗ trợ",
        message: "Trình duyệt của bạn ({browserName}) không còn được WorkAdventure hỗ trợ.",
        description:
            "Trình duyệt của bạn quá cũ để chạy WorkAdventure. Vui lòng cập nhật lên phiên bản mới nhất để tiếp tục.",
        whatToDo: "Bạn có thể làm gì?",
        option1: "Cập nhật {browserName} lên phiên bản mới nhất",
        option2: "Rời WorkAdventure và dùng một trình duyệt khác",
        updateBrowser: "Cập nhật trình duyệt",
        leave: "Rời đi",
    },
    pwaInstall: {
        title: "Cài đặt WorkAdventure",
        description:
            "Cài đặt ứng dụng để có trải nghiệm tốt hơn: truy cập nhanh, khởi động cùng máy và trải nghiệm như ứng dụng riêng.",
        descriptionIos: "Thêm WorkAdventure vào Màn hình chính để có trải nghiệm tốt hơn và truy cập nhanh.",
        feature1Title: "Truy cập nhanh",
        feature1Description: "Mở WorkAdventure từ menu Start, Dock hoặc màn hình nền của bạn.",
        feature2Title: "Cửa sổ ứng dụng riêng",
        feature2Description:
            "Tách WorkAdventure khỏi các thẻ trình duyệt và tìm thấy WorkAdventure ngay trên thanh tác vụ.",
        feature3Title: "Khởi động cùng máy tính",
        feature3Description: "Mở WorkAdventure khi thiết bị của bạn khởi động.",
        iosStepsTitle: "Cách cài đặt",
        iosStep1: "Nhấn nút Chia sẻ (hình vuông có mũi tên) ở cuối Safari.",
        iosStep2: 'Cuộn xuống và nhấn "Thêm vào Màn hình chính".',
        iosStep3: 'Nhấn "Thêm" để xác nhận.',
        install: "Cài đặt ứng dụng WorkAdventure",
        installing: "Đang cài đặt…",
        skip: "Vẫn dùng trong trình duyệt",
        continue: "Tiếp tục trong trình duyệt",
        neverShowPage: "Đừng hỏi lại",
    },
};

export default warning;
