import { derived, get } from "svelte/store";
import { LL } from "../../i18n/i18n-svelte";
import { ENABLE_TUTORIAL } from "../Enum/EnvironmentVariable";
import { currentPlayerGroupIdStore } from "../Stores/CurrentPlayerGroupStore";
import { gameSceneStore } from "../Stores/GameSceneStore";
import { inBbbStore, inJitsiStore, inLivekitStore } from "../Stores/MediaStore";
import { mapEditorMenuVisibleStore } from "../Stores/MenuStore";
import type { OnboardingItem } from "./onboardingRules";
import { releaseNotes } from "./releaseNotes";

/** `enableTutorial` in the room metadata, or `ENABLE_TUTORIAL` without metadata (self-hosted). */
const tutorialEnabled = derived(gameSceneStore, (scene) => {
    const metadata = scene?.room.metadata as { enableTutorial?: boolean } | undefined;
    return metadata ? metadata.enableTutorial === true : (ENABLE_TUTORIAL ?? true);
});

/** Someone already talking does not need the tutorial. */
const inRealConversation = derived(
    [currentPlayerGroupIdStore, inJitsiStore, inLivekitStore, inBbbStore],
    ([groupId, ...meetings]) => groupId !== undefined || meetings.some(Boolean),
);

function worldName(): string {
    return get(gameSceneStore)?.room.roomName ?? "WorkAdventure";
}

/** Built-in content, in priority order. Ids start with "wa." and never change: the state is keyed by them. */
export const builtinItems: OnboardingItem[] = [
    {
        id: "wa.tutorial",
        kind: "tutorial",
        title: () => get(LL).onboarding.tips.restartTutorial(),
        audience: { allowed: tutorialEnabled },
        doneWhen: inRealConversation,
        steps: [
            {
                type: "modal",
                title: () => get(LL).onboarding.welcome.title({ worldName: worldName() }),
                text: () => get(LL).onboarding.welcome.description(),
            },
            { type: "movement" },
            {
                type: "simulatedConversation",
                title: () => get(LL).onboarding.communication.title(),
                text: () => get(LL).onboarding.communication.description(),
            },
            {
                type: "modal",
                title: () => get(LL).onboarding.complete.title(),
                text: () => get(LL).onboarding.complete.description({ worldName: worldName() }),
            },
        ],
    },
    // The newest release first: only the first pending announcement shows. A version is added here when it is
    // released, never by a feature PR (see docs/agent/release-notes.md).
    releaseNotes("1.35"),
    {
        id: "wa.mapEditor.furniture",
        kind: "tour",
        title: () => get(LL).onboarding.mapEditorTour.title(),
        // The Tools menu starts the tour for everyone, so editor rights are checked here. On touch devices the
        // map editor has no entity list.
        audience: { allowed: mapEditorMenuVisibleStore, touch: false },
        when: { minDaysSinceFirstVisit: 1 },
        steps: [
            {
                type: "popover",
                anchor: "actionBar.mapMenu",
                advance: "click",
                title: () => get(LL).onboarding.mapEditorTour.openMenu.title(),
                text: () => get(LL).onboarding.mapEditorTour.openMenu.text({ menu: get(LL).actionbar.map() }),
            },
            {
                type: "popover",
                anchor: "mapMenu.editMap",
                side: "left",
                advance: "click",
                text: () => get(LL).onboarding.mapEditorTour.openEditor({ editor: get(LL).actionbar.mapEditor() }),
            },
            {
                type: "popover",
                anchor: "mapEditor.entityList",
                side: "left",
                title: () => get(LL).onboarding.mapEditorTour.placeObject.title(),
                text: () => get(LL).onboarding.mapEditorTour.placeObject.text(),
            },
        ],
    },
    {
        id: "wa.tip.lockBubble",
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
    },
    {
        id: "wa.tip.screenShare",
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
    },
    {
        id: "wa.tip.pictureInPicture",
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
    },
];
