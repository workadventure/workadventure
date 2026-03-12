import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const locate: DeepPartial<Translation["locate"]> = {
    userSearching: "Cercant usuari...",
    progressMessages: {
        scanning: "🔍 Escanejant el mapa...",
        lookingAround: "👀 Mirant al voltant...",
        checkingCorners: "🚶 Comprovant cada racó...",
        stillSearching: "🔎 Encara cercant...",
        maybeHiding: "💭 Potser s'estan amagant?",
        searchingWorld: "🌍 Cercant al món...",
        almostThere: "⏳ Gairebé allà...",
        gettingCloser: "🎯 Acostant-se...",
        justMomentMore: "✨ Només un moment més...",
        finalCheck: "🎪 Comprovació final...",
    },
    errorMessage: "😢 Sembla que han sortit de la sala o estan en una àrea diferent!",
};

export default locate;
