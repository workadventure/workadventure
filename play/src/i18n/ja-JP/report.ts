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
        action: "管理",
        reason: {
            label: "理由",
            placeholder: "任意。このワールドの管理者向けに保存されます。",
        },
        adminOnly: "管理者専用",
        cancel: "キャンセル",
        hint: {
            block: "相手の映像と音声を受け取らない。自分だけに適用され、取り消せます。",
            report: "このワールドの管理者に通報します。",
            kick: "今すぐ切断します。再参加は可能です。",
            ban: "永久に切断します。",
        },
        kick: {
            title: "マップから退出させる",
            content: "{userName} は直ちに切断され、後で再参加できます。",
            submit: "退出させる",
        },
        ban: {
            title: "ワールドから追放する",
            content: "{userName} は切断され、別のアカウントでもこのワールドに参加できなくなります。",
            submit: "追放する",
            confirmTitle: "{userName} を永久に追放しますか？",
            confirmContent: "ゲーム内では取り消せません。追放の解除は管理者がバックオフィスから行う必要があります。",
        },
    },
    kicked: {
        title: "退出されました",
        subtitle: "モデレーターによってこのマップから退出させられました",
        details: "再参加するにはページを再読み込みしてください。",
    },
    banned: {
        title: "追放されました",
        subtitle: "WorkAdventure から追放されました",
        details: "詳細については、hello@workadventu.re までお問い合わせください。",
    },
    reasonGiven: "理由：{reason}",
};

export default report;
