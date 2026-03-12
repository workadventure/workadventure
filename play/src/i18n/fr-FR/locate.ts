import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const locate: DeepPartial<Translation["locate"]> = {
    userSearching: "Recherche d'utilisateur...",
    progressMessages: {
        scanning: "🔍 Analyse de la carte...",
        lookingAround: "👀 Regard autour...",
        checkingCorners: "🚶 Vérification de chaque coin...",
        stillSearching: "🔎 Recherche en cours...",
        maybeHiding: "💭 Peut-être qu'ils se cachent ?",
        searchingWorld: "🌍 Recherche dans le monde...",
        almostThere: "⏳ Presque là...",
        gettingCloser: "🎯 On se rapproche...",
        justMomentMore: "✨ Encore un instant...",
        finalCheck: "🎪 Vérification finale...",
    },
    errorMessage: "😢 Il semble qu'ils aient quitté la salle ou soient dans une zone différente !",
};

export default locate;
