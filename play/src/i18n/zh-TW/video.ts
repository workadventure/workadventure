import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "網路連線問題！",
    no_video_stream_received: "未收到視訊串流。",
    user_is_muted: "{name} 已靜音。",
    reduce: "縮小",
    connecting: "連線中...",
    reconnecting: "重新連線中...",
    persistent_connection_issue: "重新連線中... 連線不穩定...",
    click_to_unblock: "點選解除封鎖",
    click_and_drag_to_resize: "點選並拖曳以調整大小",
    away: {
        subtitle: "離開期間已暫停",
        cantSeeOrHear: "沒有人能看到或聽到你",
        heardNotSeen: "別人聽得到你，但看不到你",
        cantSee: "沒有人能看到你",
        seenNotHeard: "別人看得到你，但聽不到你",
        cantHear: "沒有人能聽到你",
        turnOnBoth: "開啟攝影機和麥克風",
        turnOnCamera: "開啟攝影機",
        turnOnMicrophone: "開啟麥克風",
        turnOn: "開啟",
    },
};

export default video;
