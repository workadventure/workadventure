import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const screenAnnotation: DeepPartial<Translation["screenAnnotation"]> = {
    startAnnotating: "Chú thích trên màn hình được chia sẻ",
    stopAnnotating: "Dừng chú thích",
    tools: {
        pen: "Bút",
        line: "Đường thẳng",
        arrow: "Mũi tên",
        rect: "Hình chữ nhật",
        text: "Văn bản",
        eraser: "Tẩy",
    },
    color: "Màu",
    undo: "Hoàn tác",
    clearAll: "Xóa tất cả",
    allowAnnotations: "Cho phép người khác chú thích",
    disallowAnnotations: "Không cho người khác chú thích",
    textPlaceholder: "Nhập văn bản…",
};

export default screenAnnotation;
