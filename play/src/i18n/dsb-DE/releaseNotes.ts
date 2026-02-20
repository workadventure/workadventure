import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const releaseNotes: DeepPartial<Translation["releaseNotes"]> = {
    title: "Nowe w {version}",
    loading: "Versijowe pśipiski se zacytuju...",
    viewOnGitHub: "Na GitHub pokazaś",
    gotIt: "Rozumjem!",
};

export default releaseNotes;
