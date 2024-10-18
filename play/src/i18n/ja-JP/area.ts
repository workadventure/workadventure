import type { BaseTranslation } from "../i18n-types";

const area: BaseTranslation = {
    noAccess: "申し訳ありませんが、このエリアへのアクセス権がありません。",
    personalArea: {
        claimDescription: "ここはパーソナルエリアです。あなたのパーソナルエリアにしたいですか？",
        buttons: {
            yes: "はい",
            no: "いいえ",
        },
        personalSpaceWithNames: "{name} のパーソナルエリア",
        alreadyHavePersonalArea: "すでにパーソナルエリアを持っています。続行すると削除されます。",
    },
};

export default area;
