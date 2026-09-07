import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        backToSelectCommunication: "Quay lại chọn hình thức truyền thông",
        selectCommunication: "Chọn hình thức truyền thông",
        title: "Truyền thông toàn cầu",
        selectCamera: "Chọn camera 📹",
        selectMicrophone: "Chọn micrô 🎙️",
        liveMessage: {
            startMegaphone: "Bật loa phóng thanh",
            stopMegaphone: "Tắt loa phóng thanh",
            goingToStream: "Bạn sắp phát",
            yourMicrophone: "micrô của bạn",
            yourCamera: "camera của bạn",
            yourScreen: "màn hình của bạn",
            title: "Loa phóng thanh",
            button: "Bắt đầu thông điệp trực tiếp",
            and: "và",
            toAll: "tới tất cả người tham gia",
            confirm: "Xác nhận",
            cancel: "Hủy",
            notice: `
            Thông điệp trực tiếp hay "Loa phóng thanh" cho phép bạn gửi một thông điệp trực tiếp bằng camera và micrô tới tất cả những người đang kết nối trong phòng hoặc trong thế giới.

            Thông điệp này sẽ hiển thị ở góc dưới màn hình, giống một cuộc gọi video hoặc bong bóng thảo luận.

            Ví dụ về một thông điệp trực tiếp: "Chào mọi người, chúng ta bắt đầu hội thảo nhé? 🎉 Hãy đi theo nhân vật của tôi tới khu hội thảo và mở ứng dụng video 🚀"
            `,
            settings: "Cài đặt",
        },
        textMessage: {
            title: "Tin nhắn văn bản",
            notice: `
            Tin nhắn văn bản cho phép bạn gửi một thông điệp tới tất cả những người đang kết nối trong phòng hoặc trong thế giới.

            Thông điệp sẽ hiển thị dưới dạng cửa sổ ở đầu trang, kèm một âm thanh để báo rằng có thông tin cần đọc.

            Ví dụ: "Hội thảo ở phòng 3 bắt đầu sau 2 phút 🎉. Bạn có thể tới khu hội thảo 3 và mở ứng dụng video 🚀"
            `,
            button: "Gửi tin nhắn văn bản",
            noAccess: "Bạn không có quyền dùng tính năng này 😱 Vui lòng liên hệ quản trị viên 🙏",
        },
        audioMessage: {
            title: "Tin nhắn âm thanh",
            notice: `
            Tin nhắn âm thanh là tệp dạng "MP3, OGG..." được gửi tới tất cả người dùng đang kết nối trong phòng hoặc trong thế giới.

            Tệp âm thanh này sẽ được tải xuống và phát cho tất cả những người nhận thông báo.

            Một tin nhắn âm thanh có thể là đoạn ghi âm báo rằng hội thảo sẽ bắt đầu sau vài phút.
            `,
            button: "Gửi tin nhắn âm thanh",
            noAccess: "Bạn không có quyền dùng tính năng này 😱 Vui lòng liên hệ quản trị viên 🙏",
        },
    },
};

export default megaphone;
