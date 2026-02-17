import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const releaseNotes: DeepPartial<Translation["releaseNotes"]> = {
    title: "{version}의 새로운 기능",
    loading: "릴리스 노트 로딩 중...",
    viewOnGitHub: "GitHub에서 보기",
    gotIt: "확인!",
};

export default releaseNotes;
