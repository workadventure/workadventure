import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const locate: DeepPartial<Translation["locate"]> = {
    userSearching: "正在搜索用户...",
    progressMessages: {
        scanning: "🔍 扫描地图中...",
        lookingAround: "👀 四处查看...",
        checkingCorners: "🚶 检查每个角落...",
        stillSearching: "🔎 仍在搜索...",
        maybeHiding: "💭 也许他们躲起来了？",
        searchingWorld: "🌍 搜索世界中...",
        almostThere: "⏳ 快到了...",
        gettingCloser: "🎯 越来越近了...",
        justMomentMore: "✨ 再等一会儿...",
        finalCheck: "🎪 最终检查...",
    },
    errorMessage: "😢 看起来他们离开了房间或在不同的区域！",
};

export default locate;
