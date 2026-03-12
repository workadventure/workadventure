import type { DeepPartial } from "../DeepPartial.ts";
import type { Translation } from "../i18n-types.ts";

const camera: DeepPartial<Translation["camera"]> = {
    editCam: "编辑摄像头",
    editMic: "编辑麦克风",
    editSpeaker: "编辑音频输出",
    active: "活动",
    disabled: "已禁用",
    notRecommended: "不推荐",
    enable: {
        title: "开启你的摄像头和麦克风",
        start: "欢迎来到我们的音视频设备配置页面！在这里找到工具来增强您的在线体验。根据您的偏好调整设置以解决任何潜在问题。确保您的硬件已正确连接并保持最新。探索和测试不同的配置，找到最适合您的配置。",
    },
    help: {
        title: "需要摄像头/麦克风权限",
        permissionDenied: "拒绝访问",
        content: "你必须在浏览器设置里允许摄像头和麦克风访问权限。",
        firefoxContent: '如果你不希望Firefox反复要求授权，请选中"记住此决定"。',
        allow: "允许网络摄像头",
        continue: "不使用摄像头继续游戏",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
    },
    webrtc: {
        title: "视频中继服务器连接错误",
        titlePending: "视频中继服务器连接待处理",
        error: "无法访问 TURN 服务器",
        content: "无法访问视频中继服务器。您可能无法与其他用户通信。",
        solutionVpn: "如果您<strong>通过 VPN 连接</strong>，请断开 VPN 连接并刷新网页。",
        solutionVpnNotAskAgain: "明白了。不再警告我 🫡",
        solutionHotspot:
            "如果您在受限网络上（公司网络...），请尝试切换网络。例如，用手机创建<strong>WiFi 热点</strong>并通过手机连接。",
        solutionNetworkAdmin: "如果您是<strong>网络管理员</strong>，请查看",
        preparingYouNetworkGuide: '"准备您的网络"指南',
        refresh: "刷新",
        continue: "继续",
        newDeviceDetected: "检测到新设备 {device} 🎉 切换？[空格]",
    },
    my: {
        silentZone: "安静区",
        silentZoneDesc: "您在安静区。您只能看到和听到与您在一起的人。您无法看到或听到房间中的其他人。",
        nameTag: "你",
        loading: "正在加载您的摄像头...",
    },
    disable: "关掉你的相机",
    menu: {
        moreAction: "更多操作",
        closeMenu: "关闭菜单",
        senPrivateMessage: "发送私信 (即将推出)",
        kickoffUser: "踢出用户",
        muteAudioUser: "静音",
        askToMuteAudioUser: "请求静音",
        muteAudioEveryBody: "静音所有人",
        muteVideoUser: "关闭视频",
        askToMuteVideoUser: "请求关闭视频",
        muteVideoEveryBody: "关闭所有人的视频",
        blockOrReportUser: "审核",
    },
    backgroundEffects: {
        imageTitle: "背景图片",
        videoTitle: "背景视频",
        blurTitle: "背景模糊",
        resetTitle: "禁用背景效果",
        title: "背景效果",
        close: "关闭",
        blurAmount: "模糊程度",
    },
};

export default camera;
