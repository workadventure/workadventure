import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    modal: {
        backToSelectCommunication: "返回选择通信方式",
        selectCommunication: "选择通信方式",
        title: "全局通信",
        selectCamera: "选择摄像头 📹",
        selectMicrophone: "选择麦克风 🎙️",
        liveMessage: {
            startMegaphone: "开始扩音器",
            stopMegaphone: "停止扩音器",
            goingToStream: "您将进行流媒体传输",
            yourMicrophone: "您的麦克风",
            yourCamera: "您的摄像头",
            yourScreen: "您的屏幕",
            title: "扩音器",
            button: "开始实时消息",
            and: "和",
            toAll: "向所有参与者",
            confirm: "确认",
            cancel: "取消",
            notice: `
            实时消息或"扩音器"允许您使用摄像头和麦克风向房间或世界中所有连接的人员发送实时消息。

            此消息将显示在屏幕底部角落，就像视频通话或讨论气泡一样。

            实时消息使用示例："大家好，我们开始会议好吗？🎉 跟随我的头像前往会议区域并打开视频应用 🚀"
            `,
            settings: "设置",
        },
        textMessage: {
            title: "文本消息",
            notice: `
            文本消息允许您向房间或世界中所有连接的人员发送消息。

            此消息将作为弹出窗口显示在页面顶部，并伴有声音以标识信息可读。

            消息示例："3号房间的会议将在2分钟后开始 🎉。您可以前往会议区域3并打开视频应用 🚀"
            `,
            button: "发送文本消息",
            noAccess: "您无权访问此功能 😱 请联系管理员 🙏",
        },
        audioMessage: {
            title: "音频消息",
            notice: `
            音频消息是发送给房间或世界中所有连接用户的"MP3, OGG..."类型的消息。

            此音频消息将被下载并播放给所有收到此通知的人员。

            音频消息可以包含一个音频录音，指示会议将在几分钟后开始。
            `,
            button: "发送音频消息",
            noAccess: "您无权访问此功能 😱 请联系管理员 🙏",
        },
    },
};

export default megaphone;
