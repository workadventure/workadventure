import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const locate: DeepPartial<Translation["locate"]> = {
    userSearching: "ユーザーを検索中...",
    progressMessages: {
        scanning: "🔍 マップをスキャン中...",
        lookingAround: "👀 周りを見回しています...",
        checkingCorners: "🚶 隅々まで確認中...",
        stillSearching: "🔎 まだ検索中...",
        maybeHiding: "💭 隠れているかもしれません？",
        searchingWorld: "🌍 世界中を検索中...",
        almostThere: "⏳ もうすぐです...",
        gettingCloser: "🎯 近づいています...",
        justMomentMore: "✨ あと少し...",
        finalCheck: "🎪 最終確認中...",
    },
    errorMessage: "😢 そのユーザーはルームを退出したか、別のエリアにいるようです！",
};

export default locate;
