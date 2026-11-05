import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "网络连接问题！",
    no_video_stream_received: "未收到视频流。",
    user_is_muted: "{name} 已静音。",
    reduce: "缩小",
    connecting: "连接中...",
    reconnecting: "重新连接中...",
    persistent_connection_issue: "重新连接中... 连接不稳定...",
    click_to_unblock: "点击解除屏蔽",
    click_and_drag_to_resize: "单击并拖动以调整大小",
    away: {
        subtitle: "离开期间已暂停",
        cantSeeOrHear: "没有人能看到或听到你",
        heardNotSeen: "别人能听到你，但看不到你",
        cantSee: "没有人能看到你",
        seenNotHeard: "别人能看到你，但听不到你",
        cantHear: "没有人能听到你",
        turnOnBoth: "打开摄像头和麦克风",
        turnOnCamera: "打开摄像头",
        turnOnMicrophone: "打开麦克风",
        turnOn: "打开",
    },
};

export default video;
