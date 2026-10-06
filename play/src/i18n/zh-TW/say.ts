import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const say: DeepPartial<Translation["say"]> = {
    type: {
        say: "說",
        think: "想",
    },
    placeholder: "在此輸入您的訊息...",
    button: "建立氣泡",
    tooltip: {
        description: {
            say: "在您的角色上方顯示聊天氣泡。地圖上的所有人都看得到，並保持顯示 5 秒。",
            think: "在您的角色上方顯示思考氣泡。地圖上的所有玩家都看得到，只要您不移動就會保持顯示。",
        },
    },
};

export default say;
