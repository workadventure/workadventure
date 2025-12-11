import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    personalDesk: {
        label: "前往我的办公桌",
        unclaim: "释放我的办公桌",
        errorNoUser: "无法找到您的用户信息",
        errorNotFound: "您还没有个人办公桌",
        errorMoving: "无法到达您的个人办公桌",
        errorUnclaiming: "无法释放您的个人办公桌",
    },
};

export default actionbar;
