import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const messageScreen: DeepPartial<Translation["messageScreen"]> = {
    connecting: "Đang kết nối...",
    pleaseWait: "Vui lòng chờ trong khi chúng tôi kết nối bạn vào phòng.",
};
export default messageScreen;
