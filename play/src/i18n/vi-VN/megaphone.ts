import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    announcement: {
        title: "Gửi thông báo",
        audience: "Ai sẽ nhận?",
        thisRoom: "Phòng này",
        wholeWorld: "Toàn thế giới",
        place: "Địa điểm để đến (tùy chọn)",
        noPlace: "Không có địa điểm",
        noPlaceOnMap: "Bản đồ này chưa có khu vực nào được đặt tên.",
        preview: "Xem trước",
        sendToRoom: "Gửi đến phòng này",
        sendToWorld: "Gửi đến toàn thế giới",
        confirmWorld: "Mọi phòng trong thế giới sẽ nhận được.",
        confirmSend: "Có, gửi đến toàn thế giới",
        cancel: "Hủy",
        sentToRoom: "Đã gửi thông báo đến phòng này",
        sentToWorld: "Đã gửi thông báo đến toàn thế giới",
        join: "Đến {place}",
        joinMap: "Đến",
        placeNotFound: "Địa điểm này không còn trên bản đồ.",
        admin: "Quản trị viên",
        more: "Thông báo đang chờ: {count}",
    },
    modal: {
        liveMessage: {
            microphoneOff: "Micrô tắt",
            cameraOff: "Camera tắt",
            cameraOffHint: "Bạn có thể phát trực tiếp chỉ với micrô.",
            devices: "Camera và micrô",
            whoHears: "Ai nghe thấy bạn?",
            thisRoom: "Phòng này",
            wholeWorld: "Tất cả các phòng trong thế giới",
            live: "Trực tiếp",
            stop: "Dừng",
            startMegaphone: "Bật loa phóng thanh",
            stopMegaphone: "Tắt loa phóng thanh",
            goingToStream: "Bạn sắp phát",
            yourMicrophone: "micrô của bạn",
            yourCamera: "camera của bạn",
            yourScreen: "màn hình của bạn",
            title: "Loa phóng thanh",
            and: "và",
            toAll: "tới tất cả người tham gia",
            settings: "Cài đặt",
        },
    },
};

export default megaphone;
