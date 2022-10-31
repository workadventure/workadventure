import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const error: DeepPartial<Translation["error"]> = {
    accessLink: {
        title: "访问链接错误",
        subTitle: "找不到地图。请检查你的访问链接。",
        details: "如果你想了解更多信息，你可以联系管理员或联系我们: hello@workadventu.re",
    },
    connectionRejected: {
        title: "连接被拒绝",
        subTitle: "你无法加入该世界。请稍后重试 {error}.",
        details: "如果你想了解更多信息，你可以联系管理员或联系我们: hello@workadventu.re",
    },
    connectionRetry: {
        unableConnect: "无法链接到 WorkAdventure. 请检查互联网连接。",
    },
    error: "错误",
};

export default error;
