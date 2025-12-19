import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const locate: DeepPartial<Translation["locate"]> = {
    userSearching: "Pesquisando usuário...",
    progressMessages: {
        scanning: "🔍 Escaneando o mapa...",
        lookingAround: "👀 Olhando ao redor...",
        checkingCorners: "🚶 Verificando cada canto...",
        stillSearching: "🔎 Ainda procurando...",
        maybeHiding: "💭 Talvez estejam se escondendo?",
        searchingWorld: "🌍 Procurando no mundo...",
        almostThere: "⏳ Quase lá...",
        gettingCloser: "🎯 Chegando mais perto...",
        justMomentMore: "✨ Só mais um momento...",
        finalCheck: "🎪 Verificação final...",
    },
    errorMessage: "😢 Parece que eles saíram da sala ou estão em uma área diferente!",
};

export default locate;
