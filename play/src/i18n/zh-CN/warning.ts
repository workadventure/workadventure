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
        description: "安装应用以获得更好体验：加载更快、快速访问和类似应用的使用体验。",
        descriptionIos: "将 WorkAdventure 添加到主屏幕以获得更好体验和快速访问。",
        iosStepsTitle: "如何安装",
        iosStep1: "在 Safari 底部点击“分享”按钮（带箭头的方框）。",
        iosStep2: "向下滚动并点击“添加到主屏幕”。",
        iosStep3: "点击“添加”以确认。",
        install: "安装 WorkAdventure PWA",
        installing: "安装中…",
        skip: "在浏览器中继续",
        continue: "在浏览器中继续",
    },
};

export default warning;
