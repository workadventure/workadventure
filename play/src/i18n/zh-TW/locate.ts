import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const locate: DeepPartial<Translation["locate"]> = {
    userSearching: "正在搜尋使用者...",
    progressMessages: {
        scanning: "🔍 掃描地圖中...",
        lookingAround: "👀 四處查看...",
        checkingCorners: "🚶 檢查每個角落...",
        stillSearching: "🔎 仍在搜尋...",
        maybeHiding: "💭 也許他們躲起來了？",
        searchingWorld: "🌍 搜尋世界中...",
        almostThere: "⏳ 快到了...",
        gettingCloser: "🎯 越來越近了...",
        justMomentMore: "✨ 再等一會兒...",
        finalCheck: "🎪 最終檢查...",
    },
    errorMessage: "😢 看起來他們離開了房間或在不同的區域！",
};

export default locate;
