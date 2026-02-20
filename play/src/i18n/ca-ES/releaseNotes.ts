import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const releaseNotes: DeepPartial<Translation["releaseNotes"]> = {
    title: "Novetats de {version}",
    loading: "Carregant les notes de versió...",
    viewOnGitHub: "Veure a GitHub",
    gotIt: "Entès!",
};

export default releaseNotes;
