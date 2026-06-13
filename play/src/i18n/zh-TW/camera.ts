import type { DeepPartial } from "../DeepPartial";
import type { Translation } from "../i18n-types";

const camera: DeepPartial<Translation["camera"]> = {
    editCam: "編輯攝影機",
    editMic: "編輯麥克風",
    editSpeaker: "編輯音訊輸出",
    active: "使用中",
    disabled: "已停用",
    notRecommended: "不建議",
    enable: {
        title: "開啟你的攝影機和麥克風",
        start: "歡迎來到我們的音訊與視訊裝置設定頁面！在這裡找到工具來提升您的線上體驗。依您的偏好調整設定以解決任何潛在問題。請確保您的硬體已正確連接並保持最新。探索並測試不同的設定，找到最適合您的組合。",
    },
    help: {
        title: "需要攝影機/麥克風權限",
        cameraTitle: "需要攝影機權限",
        microphoneTitle: "需要麥克風權限",
        permissionDenied: "拒絕存取",
        cameraPermissionDenied: "攝影機權限被拒絕",
        microphonePermissionDenied: "麥克風權限被拒絕",
        cameraMicrophonePermissionDenied: "攝影機和麥克風權限被拒絕",
        content: "你必須在瀏覽器設定裡允許攝影機和麥克風的存取權限。",
        cameraContent: "你必須在瀏覽器設定裡允許攝影機的存取權限。",
        microphoneContent: "你必須在瀏覽器設定裡允許麥克風的存取權限。",
        firefoxContent: "如果你不希望 Firefox 反覆要求授權，請勾選「記住此決定」。",
        allow: "允許網路攝影機",
        allowMicrophone: "允許麥克風",
        allowCameraMicrophone: "允許網路攝影機和麥克風",
        continue: "不使用攝影機繼續遊戲",
        continueWithoutMicrophone: "不使用麥克風繼續遊戲",
        continueCameraMicrophone: "不使用網路攝影機和麥克風繼續遊戲",
        screen: {
            firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
            chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
        },
        tooltip: {
            permissionDeniedTitle: "攝影機存取被封鎖",
            permissionDeniedDesc:
                "瀏覽器拒絕了此網站的攝影機權限。請在網址列（鎖頭或攝影機圖示）或網站設定中允許存取。下圖說明與您的瀏覽器相對應。",
            noDeviceTitle: "沒有可用的攝影機",
            noDeviceDesc:
                "瀏覽器未偵測到可用的攝影機。請嘗試其他瀏覽器、檢查攝影機是否已連接、檢查電腦的設定（隱私、裝置），或在裝置正常時重新啟動電腦。",
            permissionMedia: {
                firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
                chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
                safari: "/resources/help-setting-camera-permission/en-US-firefox.png",
                android: "/resources/help-setting-camera-permission/en-US-firefox.png",
                default: "/resources/help-setting-camera-permission/en-US-firefox.png",
            },
        },
        microphoneTooltip: {
            permissionDeniedTitle: "麥克風存取被封鎖",
            permissionDeniedDesc:
                "瀏覽器拒絕了此網站的麥克風權限。請在網址列（鎖頭或麥克風圖示）或網站設定中允許存取。下圖說明與您的瀏覽器相對應。",
            noDeviceTitle: "沒有可用的麥克風",
            noDeviceDesc:
                "瀏覽器未偵測到可用的麥克風。請嘗試其他瀏覽器、檢查麥克風是否已連接、檢查電腦的設定（隱私、裝置），或在裝置正常時重新啟動電腦。",
            permissionMedia: {
                firefox: "/resources/help-setting-camera-permission/en-US-firefox.png",
                chrome: "/resources/help-setting-camera-permission/en-US-firefox.png",
                safari: "/resources/help-setting-camera-permission/en-US-firefox.png",
                android: "/resources/help-setting-camera-permission/en-US-firefox.png",
                default: "/resources/help-setting-camera-permission/en-US-firefox.png",
            },
        },
    },
    webrtc: {
        title: "視訊中繼伺服器連線錯誤",
        titlePending: "視訊中繼伺服器連線處理中",
        error: "無法存取 TURN 伺服器",
        content: "無法存取視訊中繼伺服器。您可能無法與其他使用者通訊。",
        solutionVpn: "如果您<strong>透過 VPN 連線</strong>，請中斷 VPN 連線並重新整理網頁。",
        solutionVpnNotAskAgain: "明白了。不再警告我 🫡",
        solutionHotspot:
            "如果您在受限的網路上（公司網路...），請嘗試切換網路。例如，用手機建立<strong>WiFi 熱點</strong>並透過手機連線。",
        solutionNetworkAdmin: "如果您是<strong>網路管理員</strong>，請查看",
        preparingYouNetworkGuide: "「準備您的網路」指南",
        refresh: "重新整理",
        continue: "繼續",
        newDeviceDetected: "偵測到新裝置 {device} 🎉 切換？[空白鍵] 忽略 [Esc]",
    },
    my: {
        silentZone: "安靜區",
        silentZoneDesc: "您在安靜區。您只能看到和聽到與您在一起的人。您無法看到或聽到房間中的其他人。",
        nameTag: "你",
        loading: "正在載入您的攝影機...",
    },
    disable: "關閉你的攝影機",
    menu: {
        moreAction: "更多操作",
        closeMenu: "關閉選單",
        senPrivateMessage: "傳送私訊（即將推出）",
        kickoffUser: "踢出使用者",
        muteAudioUser: "靜音",
        askToMuteAudioUser: "要求靜音",
        muteAudioEveryBody: "靜音所有人",
        muteVideoUser: "關閉視訊",
        askToMuteVideoUser: "要求關閉視訊",
        muteVideoEveryBody: "關閉所有人的視訊",
        blockOrReportUser: "管理",
    },
    backgroundEffects: {
        imageTitle: "背景圖片",
        videoTitle: "背景影片",
        blurTitle: "背景模糊",
        resetTitle: "停用背景效果",
        title: "背景效果",
        close: "關閉",
        blurAmount: "模糊程度",
    },
};

export default camera;
