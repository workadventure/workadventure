import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const video: DeepPartial<Translation["video"]> = {
    connection_issue: "接続に問題があります。",
    no_video_stream_received: "ビデオストリームが受信できません。",
    user_is_muted: "{name}はミュートされています。",
    reduce: "縮小",
    connecting: "接続中...",
    reconnecting: "再接続中...",
    persistent_connection_issue: "再接続中... 接続が不安定です...",
    click_to_unblock: "クリックしてブロックを解除",
    click_and_drag_to_resize: "クリックしてドラッグしてサイズを変更",
    away: {
        subtitle: "離席中のため一時停止中",
        cantSeeOrHear: "誰からも見えず、聞こえません",
        heardNotSeen: "声は聞こえますが、姿は見えません",
        cantSee: "誰からも見えません",
        seenNotHeard: "姿は見えますが、声は聞こえません",
        cantHear: "誰にも聞こえません",
        turnOnBoth: "カメラとマイクをオン",
        turnOnCamera: "カメラをオン",
        turnOnMicrophone: "マイクをオン",
        turnOn: "オン",
    },
    remoteAway: {
        inAnotherWindow: "{name}は別のウィンドウかタブを開いています",
        cameraAndMicPaused: "戻るまでカメラとマイクを一時停止中",
        cameraPaused: "戻るまでカメラを一時停止中",
        micPaused: "戻るまでマイクを一時停止中",
    },
};

export default video;
