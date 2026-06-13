import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        backToSelectCommunication: "返回選擇通訊方式",
        selectCommunication: "選擇通訊方式",
        title: "全域通訊",
        selectCamera: "選擇攝影機 📹",
        selectMicrophone: "選擇麥克風 🎙️",
        liveMessage: {
            startMegaphone: "開始擴音器",
            stopMegaphone: "停止擴音器",
            goingToStream: "您將進行串流傳輸",
            yourMicrophone: "您的麥克風",
            yourCamera: "您的攝影機",
            yourScreen: "您的螢幕",
            title: "擴音器",
            button: "開始即時訊息",
            and: "和",
            toAll: "向所有參與者",
            confirm: "確認",
            cancel: "取消",
            notice: `
            即時訊息或「擴音器」允許您使用攝影機和麥克風，向房間或世界中所有連線的人員傳送即時訊息。

            此訊息將顯示在螢幕底部角落，就像視訊通話或討論氣泡一樣。

            即時訊息的使用範例：「大家好，我們開始會議好嗎？🎉 跟隨我的頭像前往會議區域並開啟視訊應用程式 🚀」
            `,
            settings: "設定",
        },
        textMessage: {
            title: "文字訊息",
            notice: `
            文字訊息允許您向房間或世界中所有連線的人員傳送訊息。

            此訊息將以彈出視窗的形式顯示在頁面頂部，並伴有聲音以提示訊息可供閱讀。

            訊息範例：「3 號房間的會議將在 2 分鐘後開始 🎉。您可以前往會議區域 3 並開啟視訊應用程式 🚀」
            `,
            button: "傳送文字訊息",
            noAccess: "您無權存取此功能 😱 請聯絡管理員 🙏",
        },
        audioMessage: {
            title: "音訊訊息",
            notice: `
            音訊訊息是傳送給房間或世界中所有連線使用者的「MP3、OGG...」類型的訊息。

            此音訊訊息將被下載並播放給所有收到此通知的人員。

            音訊訊息可以包含一段音訊錄音，提示會議將在幾分鐘後開始。
            `,
            button: "傳送音訊訊息",
            noAccess: "您無權存取此功能 😱 請聯絡管理員 🙏",
        },
    },
};

export default megaphone;
