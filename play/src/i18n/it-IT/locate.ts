import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const locate: DeepPartial<Translation["locate"]> = {
    userSearching: "Ricerca utente...",
    progressMessages: {
        scanning: "🔍 Scansione della mappa...",
        lookingAround: "👀 Guardando intorno...",
        checkingCorners: "🚶 Controllando ogni angolo...",
        stillSearching: "🔎 Ancora in cerca...",
        maybeHiding: "💭 Forse si stanno nascondendo?",
        searchingWorld: "🌍 Cercando nel mondo...",
        almostThere: "⏳ Quasi lì...",
        gettingCloser: "🎯 Avvicinarsi...",
        justMomentMore: "✨ Solo un altro momento...",
        finalCheck: "🎪 Controllo finale...",
    },
    errorMessage: "😢 Sembra che abbiano lasciato la stanza o siano in un'area diversa!",
};

export default locate;
