import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const statusModal: DeepPartial<Translation["statusModal"]> = {
    accept: "受け入れる",
    allowNotificationExplanation: "誰かがあなたと話したいときにデスクトップ通知を受け取ります。",
    close: "閉じる",
    confirm: "確認する",
    goBackToOnlineStatusLabel: "オンラインに戻りますか？",
    allowNotification: "通知を許可しますか？",
    soundBlockedBackInAMoment: "現在ブラウザで音声がブロックされているため、「すぐ戻ります」モードになっています。",
    turnSoundOn: "音声を有効にする",
};

export default statusModal;
