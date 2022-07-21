import { DeepPartial } from "../../Utils/DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    enable: {
        title: "开启你的摄像头和麦克风",
        start: "出发!",
    },
    help: {
        title: "需要摄像头/麦克风权限",
        permissionDenied: "拒绝访问",
        content: "你必须在浏览器设置里允许摄像头和麦克风访问权限。",
        firefoxContent: '如果你不希望Firefox反复要求授权，请选中"记住此决定"。',
        refresh: "刷新",
        continue: "不使用摄像头继续游戏",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
    },
    my: {
        silentZone: "安静区",
    },
};

export default camera;
