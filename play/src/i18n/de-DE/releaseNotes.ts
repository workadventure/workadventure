import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const releaseNotes: DeepPartial<Translation["releaseNotes"]> = {
    title: "Neues in {version}",
    loading: "Versionshinweise werden geladen...",
    viewOnGitHub: "Auf GitHub ansehen",
    gotIt: "Verstanden!",
};

export default releaseNotes;
