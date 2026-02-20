import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const releaseNotes: DeepPartial<Translation["releaseNotes"]> = {
    title: "Nouveautés de {version}",
    loading: "Chargement des notes de version...",
    viewOnGitHub: "Voir sur GitHub",
    gotIt: "C'est noté !",
};

export default releaseNotes;
