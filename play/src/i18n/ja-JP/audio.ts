import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const audio: DeepPartial<Translation["audio"]> = {
    volumeCtrl: "オーディオ音量を変更",
    manager: {
        reduce: "会話中はオーディオプレーヤーの音量を下げる",
        allow: "オーディオを許可",
        error: "サウンドをロードできませんでした",
        notAllowed: "▶️ オーディオは許可されていません。[スペース]キーを押すか、ここをクリックして再生してください！",
    },
    message: "オーディオメッセージ",
    disable: "マイクをオフにする",
};

export default audio;
