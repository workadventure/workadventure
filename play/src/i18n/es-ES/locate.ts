import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const locate: DeepPartial<Translation["locate"]> = {
    userSearching: "Buscando usuario...",
    progressMessages: {
        scanning: "🔍 Escaneando el mapa...",
        lookingAround: "👀 Mirando alrededor...",
        checkingCorners: "🚶 Revisando cada esquina...",
        stillSearching: "🔎 Todavía buscando...",
        maybeHiding: "💭 ¿Tal vez se están escondiendo?",
        searchingWorld: "🌍 Buscando en el mundo...",
        almostThere: "⏳ Casi ahí...",
        gettingCloser: "🎯 Acercándose...",
        justMomentMore: "✨ Solo un momento más...",
        finalCheck: "🎪 Verificación final...",
    },
    errorMessage: "😢 ¡Parece que salieron de la sala o están en un área diferente!",
};

export default locate;
