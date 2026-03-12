import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const locate: DeepPartial<Translation["locate"]> = {
    userSearching: "Gebruiker zoeken...",
    progressMessages: {
        scanning: "🔍 Kaart scannen...",
        lookingAround: "👀 Rondkijken...",
        checkingCorners: "🚶 Elke hoek controleren...",
        stillSearching: "🔎 Nog steeds zoeken...",
        maybeHiding: "💭 Misschien verstoppen ze zich?",
        searchingWorld: "🌍 De wereld doorzoeken...",
        almostThere: "⏳ Bijna daar...",
        gettingCloser: "🎯 Dichterbij komen...",
        justMomentMore: "✨ Nog even...",
        finalCheck: "🎪 Laatste controle...",
    },
    errorMessage: "😢 Het lijkt erop dat ze de ruimte hebben verlaten of zich in een ander gebied bevinden!",
};

export default locate;
