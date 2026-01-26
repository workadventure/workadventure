import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const say: DeepPartial<Translation["say"]> = {
    type: {
        say: "说",
        think: "想",
    },
    placeholder: "在此输入您的消息...",
    button: "创建气泡",
    tooltip: {
        description: {
            say: "在您的角色上方显示聊天气泡。地图上的所有人都可见，保持显示5秒。",
            think: "在您的角色上方显示思考气泡。地图上的所有玩家都可见，只要您不移动就会保持显示。",
        },
    },
};

export default say;
