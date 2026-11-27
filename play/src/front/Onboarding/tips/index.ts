import type { BuiltinOnboardingItem } from "../onboardingRules";
import { lockBubble, pictureInPicture, screenShare } from "./conversation";
import { furniture } from "./mapEditor";

/**
 * Every built-in tip, in priority order: when two can start, the first one does. A new tip goes where its priority
 * puts it, not at the end by default. One file per group (`OnboardingTipGroup`), named after it.
 */
export const tips: BuiltinOnboardingItem[] = [furniture, lockBubble, screenShare, pictureInPicture];
