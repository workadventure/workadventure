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
        },
    },
    visitCard: {
        close: "关闭",
    },
    profile: {
        edit: {
            name: "编辑名字",
            woka: "编辑 WOKA",
            companion: "编辑伙伴",
            camera: "摄像头设置",
        },
        login: "登录",
        logout: "登出",
    },
    settings: {
        videoQuality: {
            title: "视频质量",
            short: {
                high: "高 (30 fps)",
                medium: "中 (20 fps)",
                small: "低 (10 fps)",
                minimum: "最低 (5 fps)",
            },
            long: {
                high: "高视频质量 (120 fps)",
                medium: "中视频质量 (60 fps, 推荐)",
                small: "低视频质量 (40 fps)",
                minimum: "最低视频质量 (20 fps)",
            },
        },
        language: {
            title: "语言",
        },
        privacySettings: {
            title: "离开模式设置",
            explanation:
                '当WorkAdventure标签页在后台时, 会切换到"离开模式"。在该模式中，你可以选择自动禁用摄像头 和/或 麦克风 直到标签页显示。',
            cameraToggle: "摄像头",
            microphoneToggle: "麦克风",
        },
        save: {
            warning: "(保存这些设置会重新加载游戏)",
            button: "保存",
        },
        fullscreen: "全屏",
        notifications: "通知",
        cowebsiteTrigger: "在打开网页和Jitsi Meet会议前总是询问",
        ignoreFollowRequest: "忽略跟随其他用户的请求",
    },
    invite: {
        description: "分享该房间的链接！",
        copy: "复制",
        share: "分享",
        walkAutomaticallyToPosition: "自动走到我的位置",
    },
    globalMessage: {
        text: "文本",
        audio: "音频",
        warning: "广播到世界的所有房间",
        enter: "输入你的消息...",
        send: "发送",
    },
    globalAudio: {
        uploadInfo: "上传文件",
        error: "未选择文件。发送前必须上传一个文件。",
        errorUpload: "上传文件错误。 请检查您的文件，然后重试。 如果问题仍然存在，请联系管理员。",
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
    sub: {
        profile: "资料",
        settings: "设置",
        invite: "邀请",
        credit: "信用",
        globalMessages: "全局消息",
        contact: "联系",
    },
};

export default menu;
