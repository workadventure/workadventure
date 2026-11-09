import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    announcement: {
        title: "发送公告",
        audience: "谁会收到？",
        thisRoom: "此房间",
        wholeWorld: "整个世界",
        place: "前往的地点（可选）",
        noPlace: "无地点",
        noPlaceOnMap: "此地图还没有命名区域。",
        preview: "预览",
        sendToRoom: "发送到此房间",
        sendToWorld: "发送到整个世界",
        confirmWorld: "世界中的所有房间都会收到。",
        confirmSend: "是，发送到整个世界",
        cancel: "取消",
        sentToRoom: "公告已发送到此房间",
        sentToWorld: "公告已发送到整个世界",
        join: "前往{place}",
        joinMap: "前往",
        placeNotFound: "该地点已不在地图上。",
        admin: "管理员",
        more: "等待中的公告：{count}",
    },
    modal: {
        liveMessage: {
            microphoneOff: "麦克风已关闭",
            cameraOff: "摄像头已关闭",
            cameraOffHint: "你可以只用麦克风进行直播。",
            devices: "摄像头和麦克风",
            whoHears: "谁能听到你？",
            thisRoom: "此房间",
            wholeWorld: "世界中的所有房间",
            live: "直播中",
            stop: "停止",
            startMegaphone: "开始扩音器",
            stopMegaphone: "停止扩音器",
            goingToStream: "您将进行流媒体传输",
            yourMicrophone: "您的麦克风",
            yourCamera: "您的摄像头",
            yourScreen: "您的屏幕",
            title: "扩音器",
            and: "和",
            toAll: "向所有参与者",
            settings: "设置",
        },
    },
};

export default megaphone;
