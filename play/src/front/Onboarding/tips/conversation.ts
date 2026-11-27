import { get } from "svelte/store";
import { LL } from "../../../i18n/i18n-svelte";
import type { BuiltinOnboardingItem } from "../onboardingRules";

/** Tips about what a conversation offers. Each starts on its button, which only shows in a bubble. */

export const lockBubble: BuiltinOnboardingItem = {
    id: "wa.conversation.lockBubble",
    kind: "tour",
    title: () => get(LL).onboarding.lockBubble.title(),
    // The lock button only shows in a bubble: the tip starts there, for someone who has not used it yet.
    when: { minDaysSinceFirstVisit: 1, onAnchor: "actionBar.lockBubble" },
    steps: [
        {
            type: "popover",
            anchor: "actionBar.lockBubble",
            skipIfUsed: "actionBar.lockBubble",
            title: () => get(LL).onboarding.lockBubble.title(),
            text: () => get(LL).onboarding.lockBubble.description(),
            video: "./static/Videos/LockBubble.mp4",
        },
    ],
};

export const screenShare: BuiltinOnboardingItem = {
    id: "wa.conversation.screenShare",
    kind: "tour",
    title: () => get(LL).onboarding.screenSharing.title(),
    when: { minDaysSinceFirstVisit: 1, onAnchor: "actionBar.screenShare" },
    steps: [
        {
            type: "popover",
            anchor: "actionBar.screenShare",
            skipIfUsed: "actionBar.screenShare",
            title: () => get(LL).onboarding.screenSharing.title(),
            text: () => get(LL).onboarding.screenSharing.description(),
            video: "./static/images/screensharing.mp4",
        },
    ],
};

export const pictureInPicture: BuiltinOnboardingItem = {
    id: "wa.conversation.pictureInPicture",
    kind: "tour",
    title: () => get(LL).onboarding.pictureInPicture.title(),
    when: { minDaysSinceFirstVisit: 3, onAnchor: "actionBar.pictureInPicture" },
    steps: [
        {
            type: "popover",
            anchor: "actionBar.pictureInPicture",
            skipIfUsed: "actionBar.pictureInPicture",
            title: () => get(LL).onboarding.pictureInPicture.title(),
            text: () => get(LL).onboarding.pictureInPicture.description(),
            video: "./static/Videos/PictureInPicture.mp4",
        },
    ],
};
