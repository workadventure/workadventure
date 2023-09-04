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
    popupBlocked: {
        title: "弹出窗口被阻止",
        content: "请在您的浏览器设置中允许此网站的弹出窗口。",
        done: "好的",
    },
};

export default warning;
