import type { Translation } from "../i18n-types";

export default {
    welcome: {
        title: "欢迎来到 WorkAdventure！ 🚀",
        description:
            "准备好探索一个虚拟世界，在这里你可以移动、与他人聊天并实时协作。让我们快速浏览一下，帮助您开始！",
        start: "开始吧！",
        skip: "跳过教程",
    },
    movement: {
        title: "移动",
        description:
            "使用键盘方向键或 WASD 在地图上移动您的角色。现在试试移动吧！",
        next: "下一步",
    },
    communication: {
        title: "通信气泡",
        description:
            "当您靠近其他玩家时，会自动进入通信气泡。您可以在同一个气泡中与其他玩家聊天！",
        video: "./static/Videos/Meet.mp4",
        next: "明白了！",
    },
    lockBubble: {
        title: "锁定您的对话",
        description:
            "点击锁定按钮以防止其他人加入您的对话气泡。这对私人讨论很有用！",
        video: "./static/Videos/LockBubble.mp4",
        hint: "点击高亮的锁定按钮试试看！",
        next: "下一步",
    },
    screenSharing: {
        title: "共享您的屏幕",
        description:
            "与对话气泡中的其他人共享您的屏幕。非常适合演示和协作！",
        video: "./static/images/screensharing.mp4",
        hint: "点击高亮的屏幕共享按钮开始共享！",
        next: "下一步",
    },
    pictureInPicture: {
        title: "画中画",
        description:
            "使用画中画模式在导航地图时保持视频通话可见。非常适合多任务处理！",
        video: "./static/Videos/PictureInPicture.mp4",
        hint: "点击高亮的 PiP 按钮激活它！",
        next: "下一步",
    },
    complete: {
        title: "您已准备就绪！ 🎉",
        description:
            "您已经学习了 WorkAdventure 的基础知识！随时可以探索、结识新朋友并享受乐趣。如果需要，您随时可以从菜单访问帮助。",
        finish: "开始探索！",
    },
} satisfies Translation["onboarding"];
