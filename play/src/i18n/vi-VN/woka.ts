import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const woka: DeepPartial<Translation["woka"]> = {
    customWoka: {
        title: "Tạo WOKA của bạn",
        navigation: {
            finish: "Hoàn tất",
            backToDefaultWoka: "Quay về WOKA mặc định",
        },
        randomize: "Ngẫu nhiên",
    },
    selectWoka: {
        title: "Chọn WOKA của bạn",
        continue: "Tiếp tục",
        customize: "Tạo WOKA của bạn",
        randomize: "Chọn ngẫu nhiên",
    },
    menu: {
        businessCard: "Danh thiếp",
    },
};

export default woka;
