import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    understand: "知道了！",
    edit: "编辑",
    cancel: "取消",
    close: "关闭",
    login: "登录",
    map: "工具",
    profil: "编辑您的姓名",
    startScreenSharing: "开始共享屏幕",
    stopScreenSharing: "停止共享屏幕",
    screenSharingMode: "屏幕共享模式",
    calendar: "日历",
    todoList: "待办事项列表",
    woka: "自定义您的头像",
    companion: "添加同伴",
    test: "测试我的设置",
    editCamMic: "编辑摄像头 / 麦克风",
    allSettings: "所有设置",
    globalMessage: "发送全局消息",
    mapEditor: "地图编辑器",
    mapEditorMobileLocked: "地图编辑器在移动模式下已锁定",
    mapEditorLocked: "地图编辑器已锁定 🔐",
    app: "第三方应用程序",
    camera: {
        disabled: "您的摄像头已禁用",
        activate: "激活您的摄像头",
        noDevices: "未找到摄像头设备",
        setBackground: "设置背景",
        blurEffects: "模糊效果",
        disableBackgroundEffects: "禁用背景效果",
        close: "关闭",
    },
    microphone: {
        disabled: "您的麦克风已禁用",
        activate: "激活您的麦克风",
        noDevices: "未找到麦克风设备",
    },
    speaker: {
        disabled: "您的扬声器已禁用",
        activate: "激活您的扬声器",
        noDevices: "未找到扬声器设备",
    },
    status: {
        ONLINE: "在线",
        AWAY: "离开",
        BACK_IN_A_MOMENT: "马上回来",
        DO_NOT_DISTURB: "请勿打扰",
        BUSY: "忙碌",
        OFFLINE: "离线",
        SILENT: "静音",
        JITSI: "会议中",
        BBB: "会议中",
        DENY_PROXIMITY_MEETING: "不可用",
        SPEAKER: "会议中",
        LIVEKIT: "会议中",
        LISTENER: "会议中",
    },
    subtitle: {
        camera: "摄像头",
        microphone: "麦克风",
        speaker: "音频输出",
    },
    background: {
        settings: "设置",
        cameraBackground: "摄像头背景",
        noEffect: "无效果",
        blur: "模糊",
        blurSmall: "轻微模糊",
        blurMiddle: "中等模糊",
        blurHigh: "高度模糊",
        images: "图片",
        videos: "视频",
    },
    help: {
        chat: {
            title: "发送文本消息",
            desc: "直接以书面形式分享您的想法或开始讨论。简单、清晰、有效。",
        },
        users: {
            title: "显示用户列表",
            desc: "看看谁在那里，访问他们的名片，给他们发消息，或者一键走到他们面前！",
        },
        emoji: {
            title: "显示表情符号",
            desc: "只需点击一下即可使用表情符号反应表达您的感受。只需点击即可！",
        },
        audioManager: {
            title: "环境声音音量",
            desc: "点击此处配置音频音量。",
            pause: "点击此处暂停音频",
            play: "点击此处播放音频",
            stop: "点击此处停止音频",
        },
        audioManagerNotAllowed: {
            title: "环境声音已阻止",
            desc: "您的浏览器已阻止环境声音播放。点击图标开始播放声音。",
        },
        follow: {
            title: "请求关注",
            desc: "您可以请求用户关注您，如果此请求被接受，他们的 Woka 将自动跟随您，从而建立无缝连接。",
        },
        unfollow: {
            title: "停止关注",
            desc: "您可以随时选择取消关注用户。然后您的 Woka 将停止跟随他们，恢复您的移动自由。",
        },
        lock: {
            title: "锁定对话",
            desc: "通过启用此功能，您可以确保没有人可以加入讨论。您是您空间的主人，只有已经存在的人可以互动。",
        },
        megaphone: {
            title: "停止扩音器",
            desc: "停止向所有用户广播您的消息。",
        },
        mic: {
            title: "启用/禁用您的麦克风",
            desc: "在讨论期间激活或关闭您的麦克风，以便其他人可以听到您的声音。",
        },
        micDisabledByStatus: {
            title: "麦克风已禁用",
            desc: '您的麦克风已禁用，因为您处于"{status}"状态。',
        },
        cam: {
            title: "启用/禁用您的摄像头",
            desc: "激活或关闭您的摄像头以向其他参与者显示您的视频。",
        },
        camDisabledByStatus: {
            title: "摄像头已禁用",
            desc: '您的摄像头已禁用，因为您处于"{status}"状态。',
        },
        share: {
            title: "共享您的屏幕",
            desc: "想与其他用户共享您的屏幕吗？您可以！您可以在聊天中向所有人显示您的屏幕，并且您可以选择共享整个屏幕或仅共享特定窗口。",
        },
        apps: {
            title: "第三方应用程序",
            desc: "您可以自由浏览外部应用程序，同时仍留在我们的应用程序中，以获得流畅和丰富的体验。",
        },
        roomList: {
            title: "房间列表",
            desc: "浏览房间列表以查看谁在场并一键加入对话。",
        },
        calendar: {
            title: "日历",
            desc: "查看您即将举行的会议并直接从 WorkAdventure 加入它们。",
        },
        todolist: {
            title: "待办事项列表",
            desc: "在不离开工作空间的情况下管理您当天的任务。",
        },
        pictureInPicture: {
            title: "画中画",
            descDisabled:
                "不幸的是，此功能在您的设备上不可用 ❌。请尝试使用其他设备或浏览器，如 Chrome 或 Edge，以访问此功能。",
            desc: "您可以使用画中画功能在对话时观看视频或演示。只需点击画中画图标即可享受您的内容。",
        },
    },
    listStatusTitle: {
        enable: "更改您的状态",
    },
    externalModule: {
        status: {
            onLine: "状态正常 ✅",
            offLine: "状态离线 ❌",
            warning: "状态警告 ⚠️",
            sync: "状态同步中 🔄",
        },
    },
    featureNotAvailable: "您的房间不可用此功能 😭",
    issueReport: {
        menuAction: "报告问题",
        formTitle: "报告问题",
        emailLabel: "电子邮件（不需要）",
        nameLabel: "姓名（不需要）",
        descriptionLabel: "描述*（必需）",
        descriptionPlaceholder: "问题是什么？您期望什么？",
        submitButtonLabel: "发送错误报告",
        cancelButtonLabel: "取消",
        confirmButtonLabel: "确认",
        addScreenshotButtonLabel: "添加截图",
        removeScreenshotButtonLabel: "删除截图",
        successMessageText: "感谢您的报告！我们将尽快审查。",
        highlightToolText: "突出显示",
        hideToolText: "隐藏",
        removeHighlightText: "删除",
    },
    personalDesk: {
        label: "前往我的办公桌",
        unclaim: "释放我的办公桌",
        errorNoUser: "无法找到您的用户信息",
        errorNotFound: "您还没有个人办公桌",
        errorMoving: "无法到达您的个人办公桌",
        errorUnclaiming: "无法释放您的个人办公桌",
    },
};

export default actionbar;
