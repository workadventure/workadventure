import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const emoji: DeepPartial<Translation["emoji"]> = {
    search: "絵文字を検索…",
    categories: {
        recents: "最近使った絵文字",
        smileys: "スマイリーとエモーション",
        people: "ピープル",
        animals: "動物と自然",
        food: "フードとドリンク",
        activities: "アクティビティ",
        travel: "旅行と場所",
        objects: "物",
        symbols: "記号",
        flags: "フラッグ",
        custom: "カスタム",
    },
    notFound: "絵文字が見つかりませんでした",
};

export default emoji;
