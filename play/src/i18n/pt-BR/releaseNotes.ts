import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const releaseNotes: DeepPartial<Translation["releaseNotes"]> = {
    title: "Novidades em {version}",
    loading: "Carregando notas da versão...",
    viewOnGitHub: "Ver no GitHub",
    gotIt: "Entendi!",
};

export default releaseNotes;
