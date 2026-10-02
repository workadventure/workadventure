import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    volumeCtrl: "變更音訊音量",
    manager: {
        reduce: "說話時降低音樂音量",
        allow: "播放聲音",
        error: "無法載入聲音",
        notAllowed: "▶️ 音訊未允許。按 [空白鍵] 或點選此處播放！",
    },
    message: "音訊訊息",
    disable: "關閉你的麥克風",
};

export default audio;
