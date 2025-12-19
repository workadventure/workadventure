import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const locate: DeepPartial<Translation["locate"]> = {
    userSearching: "Benutzer wird gesucht...",
    progressMessages: {
        scanning: "🔍 Karte wird gescannt...",
        lookingAround: "👀 Umsehen...",
        checkingCorners: "🚶 Jede Ecke prüfen...",
        stillSearching: "🔎 Immer noch suchen...",
        maybeHiding: "💭 Vielleicht verstecken sie sich?",
        searchingWorld: "🌍 Die Welt durchsuchen...",
        almostThere: "⏳ Fast geschafft...",
        gettingCloser: "🎯 Näher kommen...",
        justMomentMore: "✨ Nur noch einen Moment...",
        finalCheck: "🎪 Letzte Prüfung...",
    },
    errorMessage: "😢 Sieht so aus, als hätten sie den Raum verlassen oder sind in einem anderen Bereich!",
};

export default locate;
