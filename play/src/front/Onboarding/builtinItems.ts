import { derived, get } from "svelte/store";
import { LL } from "../../i18n/i18n-svelte";
import { ENABLE_TUTORIAL } from "../Enum/EnvironmentVariable";
import { currentPlayerGroupIdStore } from "../Stores/CurrentPlayerGroupStore";
import { gameSceneStore } from "../Stores/GameSceneStore";
import { inBbbStore, inJitsiStore, inLivekitStore } from "../Stores/MediaStore";
import type { BuiltinOnboardingItem } from "./onboardingRules";
import { releaseNotes } from "./releaseNotes";
import { tips } from "./tips";

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

/**
 * Built-in content, in priority order. Ids are `wa.<group>` or `wa.<group>.<name>`, `<group>` from `OnboardingTipGroup`
 * (a test checks it). The state is keyed by id, so a renamed item shows again.
 */
export const builtinItems: BuiltinOnboardingItem[] = [
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
    ...tips,
];
