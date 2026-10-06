import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const onboarding: DeepPartial<Translation["onboarding"]> = {
    welcome: {
        title: "Chào mừng đến với {worldName}! 🚀",
        description:
            "Hãy sẵn sàng khám phá một thế giới ảo nơi bạn có thể di chuyển, trò chuyện và cộng tác theo thời gian thực. Cùng làm một vòng tham quan nhanh để bắt đầu nhé!",
        start: "Bắt đầu nào!",
        skip: "Bỏ qua hướng dẫn",
    },
    movement: {
        title: "Di chuyển",
        descriptionDesktop:
            "Dùng các phím mũi tên hoặc WASD để di chuyển nhân vật trên bản đồ. Bạn cũng có thể bấm chuột phải để di chuyển. Thử di chuyển ngay nào!",
        descriptionMobile: "Dùng cần điều khiển hoặc chạm vào bản đồ để di chuyển nhân vật. Thử di chuyển ngay nào!",
        next: "Tiếp theo",
    },
    communication: {
        title: "Bong bóng trò chuyện",
        description:
            "Khi lại gần người chơi khác, bạn sẽ tự động vào một bong bóng trò chuyện. Bạn có thể trò chuyện với những người trong cùng bong bóng!",
        video: "./static/Videos/Meet.mp4",
        next: "Đã hiểu!",
    },
    lockBubble: {
        title: "Khóa cuộc trò chuyện của bạn",
        description:
            "Bấm nút khóa để ngăn người khác tham gia bong bóng trò chuyện của bạn. Rất hữu ích cho các cuộc thảo luận riêng tư!",
        video: "./static/Videos/LockBubble.mp4",
        hint: "Bấm vào nút khóa được đánh dấu để thử ngay!",
        next: "Tiếp theo",
    },
    screenSharing: {
        title: "Chia sẻ màn hình của bạn",
        description:
            "Chia sẻ màn hình với những người trong bong bóng trò chuyện của bạn. Hoàn hảo cho thuyết trình và cộng tác!",
        video: "./static/images/screensharing.mp4",
        hint: "Bấm vào nút chia sẻ màn hình được đánh dấu để bắt đầu!",
        next: "Tiếp theo",
    },
    pictureInPicture: {
        title: "Hình trong hình",
        description:
            "Dùng chế độ hình trong hình để giữ cuộc gọi video hiển thị trong khi bạn di chuyển trên bản đồ. Tuyệt vời để làm nhiều việc cùng lúc!",
        video: "./static/Videos/PictureInPicture.mp4",
        hint: "Bấm vào nút PiP được đánh dấu để kích hoạt!",
        next: "Tiếp theo",
    },
    complete: {
        title: "Bạn đã sẵn sàng! 🎉",
        description:
            "Bạn đã nắm được những điều cơ bản của {worldName}! Hãy thoải mái khám phá, gặp gỡ mọi người và vui chơi. Bạn luôn có thể mở phần trợ giúp từ menu khi cần.",
        finish: "Bắt đầu khám phá!",
    },
};

export default onboarding;
