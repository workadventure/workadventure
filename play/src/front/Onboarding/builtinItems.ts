import { derived, get } from "svelte/store";
import { LL } from "../../i18n/i18n-svelte";
import { ENABLE_TUTORIAL } from "../Enum/EnvironmentVariable";
import { currentPlayerGroupIdStore } from "../Stores/CurrentPlayerGroupStore";
import { gameSceneStore } from "../Stores/GameSceneStore";
import { inBbbStore, inJitsiStore, inLivekitStore } from "../Stores/MediaStore";
import { mapEditorMenuVisibleStore } from "../Stores/MenuStore";
import { lockSimulatedBubble } from "./SimulatedConversation";
import type { OnboardingItem, OnboardingStep } from "./onboardingRules";

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

/** The same steps as the tutorial of old. Touch devices have no lock, screen sharing or picture-in-picture. */
function tutorialSteps(touch: boolean): OnboardingStep[] {
    const ll = () => get(LL).onboarding;
    const bubbleButtons: OnboardingStep[] = [
        {
            type: "popover",
            anchor: "actionBar.lockBubble",
            advance: "click",
            interceptClick: true,
            // On a small screen the lock button moves to the profile menu.
            optional: true,
            title: () => ll().lockBubble.title(),
            text: () => `${ll().lockBubble.description()}\n\n*${ll().lockBubble.hint()}*`,
            video: "./static/Videos/LockBubble.mp4",
            onComplete: lockSimulatedBubble,
        },
        {
            type: "popover",
            anchor: "actionBar.screenShare",
            advance: "click",
            interceptClick: true,
            optional: true,
            title: () => ll().screenSharing.title(),
            text: () => `${ll().screenSharing.description()}\n\n*${ll().screenSharing.hint()}*`,
            video: "./static/images/screensharing.mp4",
        },
        {
            type: "popover",
            anchor: "actionBar.pictureInPicture",
            advance: "click",
            interceptClick: true,
            // Not every browser has picture-in-picture.
            optional: true,
            title: () => ll().pictureInPicture.title(),
            text: () => `${ll().pictureInPicture.description()}\n\n*${ll().pictureInPicture.hint()}*`,
            video: "./static/Videos/PictureInPicture.mp4",
        },
    ];
    return [
        {
            type: "modal",
            title: () => ll().welcome.title({ worldName: worldName() }),
            text: () => ll().welcome.description(),
        },
        { type: "movement" },
        { type: "simulatedConversation" },
        ...(touch ? [] : bubbleButtons),
        {
            type: "modal",
            title: () => ll().complete.title(),
            text: () => ll().complete.description({ worldName: worldName() }),
        },
    ];
}

/** Built-in content, in priority order. Ids start with "wa." and never change: the state is keyed by them. */
export const builtinItems: OnboardingItem[] = [
    {
        id: "wa.tutorial",
        kind: "tutorial",
        title: () => get(LL).onboarding.tips.restartTutorial(),
        audience: { allowed: tutorialEnabled, touch: false },
        doneWhen: inRealConversation,
        steps: tutorialSteps(false),
    },
    {
        id: "wa.tutorial.touch",
        kind: "tutorial",
        title: () => get(LL).onboarding.tips.restartTutorial(),
        audience: { allowed: tutorialEnabled, touch: true },
        doneWhen: inRealConversation,
        steps: tutorialSteps(true),
    },
    {
        id: "wa.announcement.tours",
        kind: "announcement",
        title: () => get(LL).onboarding.announcements.tours.title(),
        steps: [
            {
                type: "modal",
                title: () => get(LL).onboarding.announcements.tours.title(),
                text: () => get(LL).onboarding.announcements.tours.text({ help: get(LL).menu.sub.help() }),
            },
        ],
    },
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
];
