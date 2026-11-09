import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const megaphone: DeepPartial<Translation["megaphone"]> = {
    announcement: {
        title: "發送公告",
        audience: "誰會收到？",
        thisRoom: "此房間",
        wholeWorld: "整個世界",
        place: "前往的地點（選填）",
        noPlace: "無地點",
        noPlaceOnMap: "此地圖還沒有命名區域。",
        preview: "預覽",
        sendToRoom: "發送到此房間",
        sendToWorld: "發送到整個世界",
        confirmWorld: "世界中的所有房間都會收到。",
        confirmSend: "是，發送到整個世界",
        cancel: "取消",
        sentToRoom: "公告已發送到此房間",
        sentToWorld: "公告已發送到整個世界",
        join: "前往{place}",
        joinMap: "前往",
        placeNotFound: "該地點已不在地圖上。",
        admin: "管理員",
        more: "等待中的公告：{count}",
    },
    modal: {
        liveMessage: {
            microphoneOff: "麥克風已關閉",
            cameraOff: "攝影機已關閉",
            cameraOffHint: "你可以只用麥克風進行直播。",
            devices: "攝影機和麥克風",
            whoHears: "誰能聽到你？",
            thisRoom: "此房間",
            wholeWorld: "世界中的所有房間",
            live: "直播中",
            stop: "停止",
            startMegaphone: "開始擴音器",
            stopMegaphone: "停止擴音器",
            goingToStream: "您將進行串流傳輸",
            yourMicrophone: "您的麥克風",
            yourCamera: "您的攝影機",
            yourScreen: "您的螢幕",
            title: "擴音器",
            and: "和",
            toAll: "向所有參與者",
            settings: "設定",
        },
    },
};

export default megaphone;
