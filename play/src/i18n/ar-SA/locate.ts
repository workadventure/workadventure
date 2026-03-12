import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const locate: DeepPartial<Translation["locate"]> = {
    userSearching: "البحث عن المستخدم...",
    progressMessages: {
        scanning: "🔍 فحص الخريطة...",
        lookingAround: "👀 البحث في الجوار...",
        checkingCorners: "🚶 فحص كل زاوية...",
        stillSearching: "🔎 لا يزال البحث جارياً...",
        maybeHiding: "💭 ربما يختبئون؟",
        searchingWorld: "🌍 البحث في العالم...",
        almostThere: "⏳ تقريباً هناك...",
        gettingCloser: "🎯 الاقتراب أكثر...",
        justMomentMore: "✨ لحظة أخرى فقط...",
        finalCheck: "🎪 الفحص النهائي...",
    },
    errorMessage: "😢 يبدو أنهم غادروا الغرفة أو هم في منطقة مختلفة!",
};

export default locate;
