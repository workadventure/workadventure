import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const locate: DeepPartial<Translation["locate"]> = {
    userSearching: "Wužiwarja pytać...",
    progressMessages: {
        scanning: "🔍 Kartu skanować...",
        lookingAround: "👀 Wokoło wohladować...",
        checkingCorners: "🚶 Kóždy kónc kontrolować...",
        stillSearching: "🔎 Hišće pytać...",
        maybeHiding: "💭 Snadź so schowaja?",
        searchingWorld: "🌍 Swět pytać...",
        almostThere: "⏳ Přisam tam...",
        gettingCloser: "🎯 Bliže přić...",
        justMomentMore: "✨ Jenož hišće moment...",
        finalCheck: "🎪 Kónčna kontrola...",
    },
    errorMessage: "😢 Zda so, zo su wotwostali rum abo su w druhej wotrězce!",
};

export default locate;
