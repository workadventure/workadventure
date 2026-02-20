import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const releaseNotes: DeepPartial<Translation["releaseNotes"]> = {
    title: "{version} 更新内容",
    loading: "正在加载版本说明...",
    viewOnGitHub: "在 GitHub 上查看",
    gotIt: "知道了！",
};

export default releaseNotes;
