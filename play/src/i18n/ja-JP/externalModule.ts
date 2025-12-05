import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const externalModule: DeepPartial<Translation["externalModule"]> = {
    status: {
        onLine: "ステータス: OK ✅",
        offLine: "ステータス: オフライン ❌",
        warning: "ステータス: 注意 ⚠️",
        sync: "ステータス: 同期中 🔄",
    },
    teams: {
        openingMeeting: "チームミーティングの開始中...",
        unableJoinMeeting: "チームミーティングに参加できません！",
        userNotConnected: "Outlook または Google アカウントと同期されていません！",
        connectToYourTeams: "Outlook または Google アカウントに接続してください 🙏",
        temasAppInfo:
            "Teams は、チームが接続を保ち、整理された状態を維持するのに役立つ Microsoft 365 アプリです。チャット、会議、通話、コラボレーションをすべて同じ場所で行えます 😍",
        buttonSync: "Teams を同期 🚀",
        buttonConnect: "Teams に接続 🚀",
    },
    discord: {
        integration: "統合",
        explainText:
            "ここで Discord アカウントを接続すると、Workadventure チャットでメッセージを直接受信できるようになります。サーバーを同期後、含まれているルームを作成します。Workadventure チャットでそれらに参加するだけで済みます。",
        login: "Discord に接続",
        fetchingServer: "Discord サーバーを取得中... 👀",
        qrCodeTitle: "Discord アプリで QR コードをスキャンしてログインしてください。",
        qrCodeExplainText:
            "Discord アプリで QR コードをスキャンしてログインしてください。QR コードには有効期限があり、場合によっては再生成する必要があります。",
        qrCodeRegenerate: "新しい QR コードを取得",
        tokenInputLabel: "Discord トークン",
        loginToken: "トークンでログイン",
        loginTokenExplainText:
            "Discord トークンを入力する必要があります。Discord 統合を実行するには、以下を参照してください",
        sendDiscordToken: "送信",
        tokenNeeded: "Discord トークンを入力する必要があります。Discord 統合を実行するには、以下を参照してください",
        howToGetTokenButton: "Discord ログイントークンを取得する方法",
        loggedIn: "接続中:",
        saveSync: "保存して同期",
        logout: "ログアウト",
        guilds: "Discord サーバー",
        guildExplain: "Workadventure チャットインターフェースに追加するチャンネルを選択してください。\n",
    },
    outlook: {
        signIn: "Outlook でサインイン",
        popupScopeToSync: "Outlook アカウントに接続",
        popupScopeToSyncExplainText:
            "カレンダーやタスクを同期するために、Outlook アカウントに接続する必要があります。これにより、WorkAdventure で会議やタスクを表示し、マップから直接参加できるようになります。",
        popupScopeToSyncCalendar: "カレンダーを同期",
        popupScopeToSyncTask: "タスクを同期",
        popupCancel: "キャンセル",
        isSyncronized: "Outlook と同期済み",
        popupScopeIsConnectedExplainText:
            "既に接続されています。ログアウトして再接続するには、ボタンをクリックしてください。",
        popupScopeIsConnectedButton: "ログアウト",
        popupErrorTitle: "⚠️ Outlook または Teams モジュールの同期に失敗しました",
        popupErrorDescription:
            "Outlook または Teams モジュールの初期化同期に失敗しました。接続するには、再接続を試してください。",
        popupErrorContactAdmin: "問題が解決しない場合は、管理者にお問い合わせください。",
        popupErrorShowMore: "詳細情報を表示",
        popupErrorMoreInfo1:
            "サインインプロセスに問題がある可能性があります。SSO Azure プロバイダーが正しく設定されているか確認してください。",
        popupErrorMoreInfo2:
            'SSO Azure プロバイダーでスコープ "offline_access" が有効になっているか確認してください。このスコープは、更新トークンを取得し、Teams または Outlook モジュールを接続状態に保つために必要です。',
    },
    google: {
        signIn: "Google でサインイン",
        popupScopeToSync: "Google アカウントに接続",
        popupScopeToSyncExplainText:
            "カレンダーやタスクを同期するために、Google アカウントに接続する必要があります。これにより、WorkAdventure で会議やタスクを表示し、マップから直接参加できるようになります。",
        popupScopeToSyncCalendar: "カレンダーを同期",
        popupScopeToSyncTask: "タスクを同期",
        popupCancel: "キャンセル",
        isSyncronized: "Google と同期済み",
        popupScopeToSyncMeet: "オンライン会議を作成",
        openingMeet: "Google Meet を開いています... 🙏",
        unableJoinMeet: "Google Meet に参加できません 😭",
        googleMeetPopupWaiting: {
            title: "Google Meet 🎉",
            subtitle: "Google スペースを作成中… あと数秒で完了します 💪",
            guestError: "接続されていないため、Google Meet を作成できません 😭",
            guestExplain:
                "Google Meet を作成するには、プラットフォームにログインするか、所有者に作成を依頼してください 🚀",
            error: "Google Workspace の設定により、Meet を作成できません。",
            errorExplain: "心配ありません。他の誰かがリンクを共有した場合でも、会議に参加できます 🙏",
        },
        popupScopeIsConnectedButton: "ログアウト",
        popupScopeIsConnectedExplainText:
            "既に接続されています。ログアウトして再接続するには、ボタンをクリックしてください。",
    },
    calendar: {
        title: "今日の会議",
        joinMeeting: "ここをクリックして会議に参加",
    },
    todoList: {
        title: "To Do",
        sentence: "休憩してください 🙏 コーヒーやお茶はいかがですか？ ☕",
    },
};

export default externalModule;
