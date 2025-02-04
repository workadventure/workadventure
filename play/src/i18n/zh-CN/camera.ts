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
        continue: "不使用摄像头继续游戏",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
    },
    /*webrtc: {
        title: "TODO: Video relay server connection error",
        titlePending: "TODO: Video relay server connection pending",
        error: "TODO: TURN server isn't reachable",
        content: "TODO: The video relay server cannot be reached. You may be unable to communicate with other users.",
        solutionVpn: "TODO: If you are <strong>connecting via a VPN</strong>, please disconnect from you VPN and refresh the web page.",
        solutionHotspot: "TODO: If you are on a restricted network (company network...), try switching network. For instance, create a <strong>Wifi hotspot</strong> with your phone and connect via your phone.",
        solutionNetworkAdmin: "TODO: If you are a <strong>network administrator</strong>, review the ",
        preparingYouNetworkGuide: 'TODO: "Preparing your network" guide',
        refresh: "TODO: Refresh",
        continue: "TODO: Continue",
    },*/
    my: {
        silentZone: "安静区",
        nameTag: "你",
    },
    disable: "关掉你的相机",
    menu: {
        moreAction: "更多操作",
        closeMenu: "关闭菜单",
        senPrivateMessage: "发送私信 (即将推出)",
        kickoffUser: "踢出用户",
        muteAudioUser: "静音",
        muteAudioEveryBody: "静音所有人",
        muteVideoUser: "关闭视频",
        muteVideoEveryBody: "关闭所有人的视频",
        pin: "固定",
        blockOrReportUser: "屏蔽或举报用户",
    },
};

export default camera;
