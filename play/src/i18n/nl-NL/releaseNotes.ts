import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const releaseNotes: DeepPartial<Translation["releaseNotes"]> = {
    title: "Wat is er nieuw in {version}",
    loading: "Release notes laden...",
    viewOnGitHub: "Bekijk op GitHub",
    gotIt: "Begrepen!",
};

export default releaseNotes;
