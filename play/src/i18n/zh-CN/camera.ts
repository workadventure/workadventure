import type { DeepPartial } from "../DeepPartial";
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
    webrtc: {
        title: "WebRtc connection error",
        error: "STUN / TURN server isn't reachable",
        content:
            "The video relay server cannot be reached. You may be unable to communicate with other users. If you are connecting via a VPN, please disconnect and refresh the web page. You may click on the link below to test your WebRtc connection.",
        testUrl: "WebRtc connection test",
        refresh: "Refresh",
        continue: "Continue",
    },
    my: {
        silentZone: "安静区",
        nameTag: "你",
    },
    disable: "关掉你的相机",
};

export default camera;
