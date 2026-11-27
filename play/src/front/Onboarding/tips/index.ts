import type { BuiltinOnboardingItem } from "../onboardingRules";
import { lockBubbleTip, pictureInPictureTip, screenShareTip } from "./conversation";
import { furnitureTip } from "./mapEditor";

/**
 * Every built-in tip, in priority order: when two can start, the first one does. A new tip goes where its priority
 * puts it, not at the end by default. One file per group (`OnboardingTipGroup`), named after it.
 */
export const tips: BuiltinOnboardingItem[] = [furnitureTip, lockBubbleTip, screenShareTip, pictureInPictureTip];
