import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const locate: DeepPartial<Translation["locate"]> = {
    userSearching: "Đang tìm người dùng...",
    progressMessages: {
        scanning: "🔍 Đang quét bản đồ...",
        lookingAround: "👀 Đang nhìn quanh...",
        checkingCorners: "🚶 Đang kiểm tra từng ngóc ngách...",
        stillSearching: "🔎 Vẫn đang tìm...",
        maybeHiding: "💭 Có khi họ đang trốn?",
        searchingWorld: "🌍 Đang tìm khắp thế giới...",
        almostThere: "⏳ Sắp xong...",
        gettingCloser: "🎯 Đang đến gần...",
        justMomentMore: "✨ Chờ thêm chút nữa...",
        finalCheck: "🎪 Kiểm tra lần cuối...",
    },
    errorMessage: "😢 Có vẻ họ đã rời phòng hoặc đang ở một khu vực khác!",
};

export default locate;
