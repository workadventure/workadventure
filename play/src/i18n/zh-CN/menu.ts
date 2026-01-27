import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const menu: DeepPartial<Translation["menu"]> = {
    title: "菜单",
    icon: {
        open: {
            menu: "打开菜单",
            invite: "显示邀请",
            register: "注册",
            chat: "打开聊天",
            userlist: "用户名单",
            openEmoji: "打开表情符号选择弹出窗口",
            closeEmoji: "关闭表情符号菜单",
            mobile: "打开移动菜单",
            calendar: "打开日历",
            todoList: "打开待办事项列表",
        },
    },
    visitCard: {
        close: "关闭",
        sendMessage: "发送消息",
    },
    profile: {
        login: "登录",
        logout: "登出",
    },
    settings: {
        videoBandwidth: {
            title: "视频质量",
            low: "低",
            recommended: "推荐",
            high: "High",
        },
        shareScreenBandwidth: {
            title: "屏幕共享质量",
            low: "低",
            recommended: "推荐",
            high: "High",
        },
        language: {
            title: "语言",
        },
        privacySettings: {
            title: "离开模式设置",
            explanation:
                '当WorkAdventure标签页在后台时, 会切换到"离开模式"。在该模式中，你可以选择自动禁用摄像头 和/或 麦克风 直到标签页显示。',
            cameraToggle: '在"离开模式"中保持摄像头活动',
            microphoneToggle: '在"离开模式"中保持麦克风活动',
        },
        save: "保存",
        otherSettings: "所有设置",
        fullscreen: "全屏",
        notifications: "通知",
        enablePictureInPicture: "启用画中画",
        chatSounds: "聊天声音",
        cowebsiteTrigger: "在打开网页和Jitsi Meet会议前总是询问",
        ignoreFollowRequest: "忽略跟随其他用户的请求",
        proximityDiscussionVolume: "邻近讨论音量",
        blockAudio: "阻止环境声音和音乐",
        disableAnimations: "禁用地图动画",
        bubbleSound: "气泡声音",
        bubbleSoundOptions: {
            ding: "叮",
            wobble: "摆动",
        },
        displayVideoQualityStats: "显示视频质量统计",
    },
    invite: {
        description: "分享该房间的链接！",
        copy: "复制",
        copied: "已复制",
        share: "分享",
        walkAutomaticallyToPosition: "自动走到我的位置",
        selectEntryPoint: "使用不同的入口点",
        selectEntryPointSelect: "选择用户将到达的入口点",
    },
    globalMessage: {
        text: "文本",
        audio: "音频",
        warning: "广播到世界的所有房间",
        enter: "在此输入您的消息...",
        send: "发送",
    },
    globalAudio: {
        uploadInfo: "上传文件",
        error: "未选择文件。发送前必须上传一个文件。",
        errorUpload: "上传文件错误。 请检查您的文件，然后重试。 如果问题仍然存在，请联系管理员。",
        dragAndDrop: "拖放或点击此处上传您的文件 🎧",
    },
    contact: {
        gettingStarted: {
            title: "开始",
            description:
                "WorkAdventure使你能够创建一个在线空间，与他们自然地交流。这都从创建你自己的空间开始。从我们的团队预制的大量选项中选择一个地图。",
        },
        createMap: {
            title: "创建地图",
            description: "你也可以跟随文档中的步骤创建你自己的地图。",
        },
    },
    about: {
        mapInfo: "地图信息",
        mapLink: "地图链接",
        copyrights: {
            map: {
                title: "地图版权",
                empty: "地图创建者未申明地图版权。",
            },
            tileset: {
                title: "tilesets版权",
                empty: "地图创建者未申明tilesets版权。这不意味着这些tilesets没有版权。",
            },
            audio: {
                title: "音频文件版权",
                empty: "地图创建者未申明音频文件版权。这不意味着这些音频文件没有版权。",
            },
        },
    },
    chat: {
        matrixIDLabel: "您的 Matrix ID",
        settings: "设置",
        resetKeyStorageUpButtonLabel: "重置您的密钥存储",
        resetKeyStorageConfirmationModal: {
            title: "密钥存储重置确认",
            content: "您即将重置密钥存储。您确定吗？",
            warning:
                "重置密钥存储将删除您当前的会话和所有受信任的用户。您可能会失去对某些过往消息的访问权限，并且不再被识别为受信任的用户。请确保在继续之前完全理解此操作的后果。",
            cancel: "取消",
            continue: "继续",
        },
    },
    sub: {
        profile: "资料",
        settings: "设置",
        invite: "邀请",
        credit: "信用",
        globalMessages: "全局消息",
        contact: "联系",
        report: "报告问题",
        chat: "聊天",
        help: "帮助和教程",
        contextualActions: "上下文操作",
        shortcuts: "快捷键",
    },
    shortcuts: {
        title: "键盘快捷键",
        keys: "快捷键",
        actions: "操作",
        moveUp: "向上移动",
        moveDown: "向下移动",
        moveLeft: "向左移动",
        moveRight: "向右移动",
        speedUp: "跑步",
        interact: "交互",
        follow: "跟随",
        openChat: "打开聊天",
        openUserList: "打开用户列表",
        toggleMapEditor: "显示/隐藏地图编辑器",
        rotatePlayer: "旋转玩家",
        emote1: "表情 1",
        emote2: "表情 2",
        emote3: "表情 3",
        emote4: "表情 4",
        emote5: "表情 5",
        emote6: "表情 6",
        openSayPopup: "打开说弹出窗口",
        openThinkPopup: "打开思考弹出窗口",
        walkMyDesk: "走到我的办公桌",
    },
};

export default menu;
