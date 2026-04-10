import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    volumeCtrl: "更改音频音量",
    manager: {
        reduce: "说话时降低音乐音量",
        allow: "播放声音",
        error: "无法加载声音",
        notAllowed: "▶️ 音频未允许。按 [空格] 或点击此处播放！",
    },
    message: "音频消息",
    disable: "关掉你的麦克风",
};

export default audio;
