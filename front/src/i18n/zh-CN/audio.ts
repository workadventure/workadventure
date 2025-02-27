import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    manager: {
        reduce: "说话时降低音乐音量",
        allow: "播放声音",
    },
    message: "音频消息",
    disable: "关掉你的麦克风",
};

export default audio;
