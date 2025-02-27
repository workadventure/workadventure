import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const report: DeepPartial<Translation["report"]> = {
    block: {
        title: "ブロック",
        content: "{userName} とのコミュニケーションをブロックします。これは元に戻すことができます。",
        unblock: "このユーザーのブロックを解除",
        block: "このユーザーをブロック",
    },
    title: "報告",
    content: "このルームの管理者に報告メッセージを送信します。今後、このユーザーは BAN されるかもしれません。",
    message: {
        title: "メッセージ",
        empty: "メッセージを空にすることはできません。",
        error: "メッセージエラーを報告する場合は、管理者に問い合わせてください。",
    },
    submit: "このユーザーを報告する",
    moderate: {
        title: "{userName} の管理",
        block: "ブロック",
        report: "報告",
        noSelect: "エラー : アクションが選択されていません。",
    },
};

export default report;
