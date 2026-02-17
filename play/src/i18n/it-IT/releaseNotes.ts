import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const releaseNotes: DeepPartial<Translation["releaseNotes"]> = {
    title: "Novità in {version}",
    loading: "Caricamento note di versione...",
    viewOnGitHub: "Visualizza su GitHub",
    gotIt: "Capito!",
};

export default releaseNotes;
