import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const error: DeepPartial<Translation["error"]> = {
    accessLink: {
        title: "リンクが正しくありません",
        subTitle: "マップが見つかりませんでした。リンクを確認してください。",
        details: "詳しくは管理者にお問い合わせください。",
    },
    connectionRejected: {
        title: "接続が拒否されました",
        subTitle: "ワールドに参加できませんでした。後でもう一度試してみてください。{error}",
        details: "詳しくは管理者にお問い合わせください。",
    },
    connectionRetry: {
        unableConnect: "WorkAdventure に接続できません。インターネットに接続されていますか？",
    },
    errorDialog: {
        title: "エラー 😱",
        hasReportIssuesUrl: "より詳細な情報が必要な場合は、管理者に連絡するか、下記まで問題を報告してください。",
        noReportIssuesUrl: "より詳細な情報が必要な場合は、ワールドの管理者に連絡してください。",
        messageFAQ: "私たちのサイトもご覧ください。",
        reload: "更新",
        close: "閉じる",
    },
};

export default error;
