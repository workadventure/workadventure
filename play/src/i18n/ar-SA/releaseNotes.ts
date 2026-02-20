import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const releaseNotes: DeepPartial<Translation["releaseNotes"]> = {
    title: "ما الجديد في {version}",
    loading: "جاري تحميل ملاحظات الإصدار...",
    viewOnGitHub: "عرض على GitHub",
    gotIt: "فهمت!",
};

export default releaseNotes;
