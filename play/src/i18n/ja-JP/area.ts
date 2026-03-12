import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const area: DeepPartial<Translation["area"]> = {
    noAccess: "申し訳ありませんが、このエリアへのアクセス権がありません。",
    blocked: {
        locked: "このエリアはロックされています。入ることができません。",
        maxUsers: "このエリアは満員です。入ることができません。",
        noAccess: "申し訳ありませんが、このエリアへのアクセス権がありません。",
        unlockWithTrigger: "{trigger}でこのエリアのロックを解除します。",
    },
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
