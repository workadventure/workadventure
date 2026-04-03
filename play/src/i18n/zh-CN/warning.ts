import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const warning: DeepPartial<Translation["warning"]> = {
    title: "警告!",
    content: `该世界已接近容量限制！你可以 <a href="{upgradeLink}" target="_blank">点击这里</a> 升级它的容量`,
    limit: "该世界已接近容量限制!",
    accessDenied: {
        camera: "摄像头访问权限被拒绝。点击这里检查你的浏览器权限。",
        screenSharing: "屏幕共享权限被拒绝。点击这里检查你的浏览器权限。",
        teleport: "您无权传送给此用户。",
        room: "房间访问被拒绝。你不能进入这个房间",
    },
    importantMessage: "重要消息",
    connectionLost: "连接丢失。重新连接中...",
    connectionLostTitle: "连接丢失。",
    connectionLostSubtitle: "重新连接中",
    waitingConnectionTitle: "等待连接",
    waitingConnectionSubtitle: "连接",
    megaphoneNeeds: "要使用扩音器，您必须激活摄像头或麦克风，或共享屏幕。",
    mapEditorShortCut: "尝试打开地图编辑器时出错。",
    mapEditorNotEnabled: "地图编辑器在此世界中未启用。",
    backgroundProcessing: {
        failedToApply: "应用背景效果失败",
    },
    popupBlocked: {
        title: "弹出窗口被阻止",
        content: "请在您的浏览器设置中允许此网站的弹出窗口。",
        done: "好的",
    },
    duplicateUserConnected: {
        title: "已连接",
        message: "该用户已从其他标签页或设备连接到此房间。为避免冲突，请关闭其他标签页或窗口。",
        confirmContinue: "知道了，继续",
        dontRemindAgain: "不再显示此消息",
    },
    browserNotSupported: {
        title: "😢 不支持的浏览器",
        message: "您的浏览器（{browserName}）不再受 WorkAdventure 支持。",
        description: "您的浏览器太旧，无法运行 WorkAdventure。请更新到最新版本以继续。",
        whatToDo: "您可以做什么？",
        option1: "将 {browserName} 更新到最新版本",
        option2: "退出 WorkAdventure 并使用其他浏览器",
        updateBrowser: "更新浏览器",
        leave: "离开",
    },
    pwaInstall: {
        title: "安装 WorkAdventure",
        description: "安装应用以获得更好的体验：快速访问、开机启动以及更像原生应用的体验。",
        descriptionIos: "将 WorkAdventure 添加到主屏幕，以获得更好的体验和快速访问。",
        feature1Title: "快速访问",
        feature1Description: "从开始菜单、Dock 或桌面启动 WorkAdventure。",
        feature2Title: "独立应用窗口",
        feature2Description: "让 WorkAdventure 与浏览器标签页分开，并可在任务栏中一眼找到它。",
        feature3Title: "随电脑启动",
        feature3Description: "在设备启动时启动 WorkAdventure。",
        iosStepsTitle: "如何安装",
        iosStep1: "在 Safari 底部点击“分享”按钮（带箭头的方框）。",
        iosStep2: "向下滚动并点击“添加到主屏幕”。",
        iosStep3: "点击“添加”以确认。",
        install: "安装 WorkAdventure 应用",
        installing: "安装中…",
        skip: "在浏览器中继续",
        continue: "在浏览器中继续",
        neverShowPage: "不再询问",
    },
};

export default warning;
