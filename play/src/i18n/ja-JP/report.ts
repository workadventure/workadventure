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
            placeholder: "任意。{userName} さんにこのメッセージが表示されます。",
        },
        adminOnly: "管理者専用",
        cancel: "キャンセル",
        hint: {
            block: "相手の映像と音声を受け取らない。自分だけに適用され、取り消せます。",
            report: "管理者に通報します。",
            kick: "今すぐ切断します。再参加は可能です。",
            ban: "永久に切断します。",
        },
        kick: {
            title: "退出させる",
            content: "{userName} は直ちに切断され、後で再参加できます。",
            submit: "退出させる",
            confirmTitle: "{userName} を退出させる",
        },
        ban: {
            title: "ワールドから追放する",
            content: "{userName} は切断され、このアカウントではこのワールドに参加できなくなります。",
            submit: "追放する",
            confirmTitle: "{userName} を追放しますか？",
            confirmContent:
                "管理者は後から、メニューの「禁止されたユーザー」ページ（このワールドにある場合）またはバックオフィスで追放を解除できます。",
            scope: {
                account: "このアカウント",
                ip: "このアカウントとその IP アドレス",
                ipHint: "同じ接続からの新しいアカウントと、その接続を共有する全員（オフィス、学校など）もブロックします。",
                ipUnknown: "利用できません：このユーザーはすでに接続していません。",
                ipShared: "利用できません：あなたもこの IP アドレスを共有しているため、自分自身もブロックされます。",
                loading: "この IP アドレスを共有している人を確認中…",
                error: "利用できません：この IP アドレスを共有している人を確認できませんでした。",
                nobody: "現在、この IP アドレスからこのワールドに接続している他のユーザーはいません。後でこのアドレスから戻ってきた人もブロックされます。",
                others: "同時にブロックされる、現在この IP アドレスからこのワールドに接続しているユーザー（{count}）：",
                submitWithOthers: "この {count} 人を追放",
            },
        },
    },
    kicked: {
        title: "退出されました",
        subtitle: "モデレーターによってこのマップから退出させられました",
    },
    banned: {
        title: "追放されました",
        subtitle: "WorkAdventure から追放されました",
        details: "詳細については、hello@workadventu.re までお問い合わせください。",
    },
    reasonGiven: "理由：{reason}",
};

export default report;
