import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const releaseNotes: DeepPartial<Translation["releaseNotes"]> = {
    title: "{version} の新機能",
    loading: "リリースノートを読み込み中...",
    viewOnGitHub: "GitHubで見る",
    gotIt: "了解！",
};

export default releaseNotes;
