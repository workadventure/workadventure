import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "欢迎来到 {worldName}！ 🚀",
        description: "准备好探索一个虚拟世界，在这里你可以移动、与他人聊天并实时协作。让我们快速浏览一下，帮助您开始！",
    },
    movement: {
        title: "移动",
        descriptionDesktop: "使用方向键或 WASD 移动您的角色。您也可以右键点击来移动。现在试试移动吧！",
        descriptionTouch: "点击地图即可走到该处，拖动可以环顾四周。现在试试移动吧！",
        next: "下一步",
    },
    communication: {
        title: "通信气泡",
        description: "当您靠近其他玩家时，会自动进入通信气泡。您可以在同一个气泡中与其他玩家聊天！",
    },
    lockBubble: {
        title: "锁定您的对话",
        description: "点击锁定按钮以防止其他人加入您的对话气泡。这对私人讨论很有用！",
    },
    screenSharing: {
        title: "共享您的屏幕",
        description: "与对话气泡中的其他人共享您的屏幕。非常适合演示和协作！",
    },
    pictureInPicture: {
        title: "画中画",
        description: "使用画中画模式在导航地图时保持视频通话可见。非常适合多任务处理！",
    },
    complete: {
        title: "您已准备就绪！ 🎉",
        description:
            "您已经学习了 {worldName} 的基础知识！随时可以探索、结识新朋友并享受乐趣。如果需要，您随时可以从菜单访问帮助。",
    },
    tips: {
        label: "提示",
        next: "下一步",
        previous: "上一步",
        gotIt: "知道了",
        close: "关闭",
        stopShowing: "不再显示提示",
        restartTutorial: "重新开始教程",
        showMe: "带我看看",
        notNow: "以后再说",
    },
    releaseNotes: {
        title: "WorkAdventure {version} 新功能",
    },
    mapEditorTour: {
        title: "使用地图编辑器摆放家具",
        openMenu: {
            title: "打造你的专属空间",
            text: "你可以修改这张地图。打开 **{menu}** 菜单开始吧。",
        },
        openEditor: "点击 **{editor}**。",
        placeObject: {
            title: "摆放家具",
            text: "从列表中选择一个物品，然后点击地图进行摆放。",
        },
    },
} satisfies Translation["onboarding"];
