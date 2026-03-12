import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const locate: DeepPartial<Translation["locate"]> = {
    userSearching: "Wužywarja pytaś...",
    progressMessages: {
        scanning: "🔍 Kórtu skaněrowaś...",
        lookingAround: "👀 Wokoło woglědaś...",
        checkingCorners: "🚶 Kuždy kóńc kontrolěrowaś...",
        stillSearching: "🔎 Hyšći pytaś...",
        maybeHiding: "💭 Snaź se schowaju?",
        searchingWorld: "🌍 Swět pytaś...",
        almostThere: "⏳ Pśisamem tam...",
        gettingCloser: "🎯 Blížej pśiś...",
        justMomentMore: "✨ Jano hyšći moment...",
        finalCheck: "🎪 Kóńcna kontrola...",
    },
    errorMessage: "😢 Zda se, až su wótwoźili rum abo su w drugej wótrězce!",
};

export default locate;
