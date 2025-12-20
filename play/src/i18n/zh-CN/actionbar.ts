import type { Translation } from "../i18n-types";
import type { DeepPartial } from "../DeepPartial";

const actionbar: DeepPartial<Translation["actionbar"]> = {
    help: {
        audioManager: {
            title: "环境声音音量",
            desc: "点击此处配置音频音量。",
            pause: "点击此处暂停音频",
            play: "点击此处播放音频",
            stop: "点击此处停止音频",
        },
        audioManagerNotAllowed: {
            title: "环境声音已阻止",
            desc: "您的浏览器已阻止环境声音播放。点击图标开始播放声音。",
        },
    },
    personalDesk: {
        label: "前往我的办公桌",
        unclaim: "释放我的办公桌",
        errorNoUser: "无法找到您的用户信息",
        errorNotFound: "您还没有个人办公桌",
        errorMoving: "无法到达您的个人办公桌",
        errorUnclaiming: "无法释放您的个人办公桌",
    },
};

export default actionbar;
