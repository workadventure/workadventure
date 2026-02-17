import type { TranslationFunctions } from "../../../i18n/i18n-types";

export type LoadingTip = {
    video: string;
    getTitle: (LL: TranslationFunctions) => string;
    getDesc: (LL: TranslationFunctions) => string;
};

/**
 * Loading tips from menu buttons. Uses the same videos and i18n as the action bar.
 */
export const LOADING_TIPS: LoadingTip[] = [
    {
        video: "./static/Videos/Chat.mp4",
        getTitle: (LL) => LL.actionbar.help.chat.title(),
        getDesc: (LL) => LL.actionbar.help.chat.desc(),
    },
    {
        video: "./static/Videos/UserList.mp4",
        getTitle: (LL) => LL.actionbar.help.users.title(),
        getDesc: (LL) => LL.actionbar.help.users.desc(),
    },
    {
        video: "./static/Videos/Smileys.mp4",
        getTitle: (LL) => LL.actionbar.help.emoji.title(),
        getDesc: (LL) => LL.actionbar.help.emoji.desc(),
    },
    {
        video: "./static/Videos/Follow.mp4",
        getTitle: (LL) => LL.actionbar.help.follow.title(),
        getDesc: (LL) => LL.actionbar.help.follow.desc(),
    },
    {
        video: "./static/Videos/LockBubble.mp4",
        getTitle: (LL) => LL.actionbar.help.lock.title(),
        getDesc: (LL) => LL.actionbar.help.lock.desc(),
    },
    {
        video: "./static/images/screensharing.mp4",
        getTitle: (LL) => LL.actionbar.help.share.title(),
        getDesc: (LL) => LL.actionbar.help.share.desc(),
    },
    {
        video: "./static/Videos/PictureInPicture.mp4",
        getTitle: (LL) => LL.actionbar.help.pictureInPicture.title(),
        getDesc: (LL) => LL.actionbar.help.pictureInPicture.desc(),
    },
    {
        video: "./static/Videos/Record.mp4",
        getTitle: (LL) => LL.recording.actionbar.title.start(),
        getDesc: (LL) => LL.recording.actionbar.desc.advert(),
    },
];

export function getRandomLoadingTip(excludeVideo?: string): LoadingTip {
    const available = excludeVideo ? LOADING_TIPS.filter((t) => t.video !== excludeVideo) : LOADING_TIPS;
    const tips = available.length > 0 ? available : LOADING_TIPS;
    return tips[Math.floor(Math.random() * tips.length)];
}
