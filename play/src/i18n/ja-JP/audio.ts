import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    manager: {
        reduce: "会話中はオーディオプレーヤーの音量を下げる",
        allow: "オーディオを許可",
        error: "サウンドをロードできませんでした",
    },
    message: "オーディオメッセージ",
    disable: "マイクをオフにする",
};

export default audio;
