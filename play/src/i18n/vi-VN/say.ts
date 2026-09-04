import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const say: DeepPartial<Translation["say"]> = {
    type: {
        say: "Nói",
        think: "Nghĩ",
    },
    placeholder: "Nhập tin nhắn của bạn tại đây...",
    button: "Tạo bong bóng",
    tooltip: {
        description: {
            say: "Hiển thị bong bóng thoại phía trên nhân vật của bạn. Mọi người trên bản đồ đều thấy, và nó hiển thị trong 5 giây.",
            think: "Hiển thị bong bóng suy nghĩ phía trên nhân vật của bạn. Mọi người chơi trên bản đồ đều thấy, và nó hiển thị chừng nào bạn chưa di chuyển.",
        },
    },
};

export default say;
