import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const releaseNotes: DeepPartial<Translation["releaseNotes"]> = {
    title: "Nowe w {version}",
    loading: "Wersijowe připiski so začitaja...",
    viewOnGitHub: "Na GitHub pokazać",
    gotIt: "Rozumju!",
};

export default releaseNotes;
