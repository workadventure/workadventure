import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const releaseNotes: DeepPartial<Translation["releaseNotes"]> = {
    title: "Novedades de {version}",
    loading: "Cargando notas de la versión...",
    viewOnGitHub: "Ver en GitHub",
    gotIt: "¡Entendido!",
};

export default releaseNotes;
