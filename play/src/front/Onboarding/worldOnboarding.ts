import { get } from "svelte/store";
import { parseOnboardingData } from "@workadventure/messages";
import type { OnboardingData, OnboardingItemData, OnboardingText } from "@workadventure/messages";
import { locale } from "../../i18n/i18n-svelte";
import { idGroup } from "./onboardingRules";
import type { OnboardingItem, OnboardingStep } from "./onboardingRules";

/** Past this, the world's items are left out and only the built-in ones run. */
const FETCH_TIMEOUT_MS = 5000;

/** The text for `lang` ("fr-FR"): that locale, then the same language ("fr-*"), then en-US, then the first one. */
export function pickText(text: OnboardingText, lang: string): string {
    if (typeof text === "string") {
        return text;
    }
    const language = lang.split("-")[0];
    return (
        text[lang] ??
        Object.entries(text).find(([key]) => key.split("-")[0] === language)?.[1] ??
        text["en-US"] ??
        Object.values(text)[0] ??
        ""
    );
}

/** Read at display time, so it follows the current locale. */
function localized(text: OnboardingText): () => string {
    return () => pickText(text, get(locale));
}

function worldItem(item: OnboardingItemData): OnboardingItem {
    const steps = item.steps.map(
        (step): OnboardingStep => ({
            ...step,
            title: step.title === undefined ? undefined : localized(step.title),
            text: localized(step.text),
        }),
    );
    const title = item.title ?? item.steps.find((step) => step.title !== undefined)?.title;
    return { ...item, title: title === undefined ? () => item.id : localized(title), steps };
}

/** The world's items first, then the built-in items it keeps. */
export function mergeItems(builtin: OnboardingItem[], world: OnboardingData | undefined): OnboardingItem[] {
    const disabledTours: string[] = world?.builtin?.disabledTours ?? [];
    const disabledGroups: string[] = world?.builtin?.disabledGroups ?? [];
    const kept = builtin.filter(
        (item) =>
            !disabledGroups.includes(idGroup(item.id)) &&
            (item.kind === "announcement" ? world?.builtin?.announcements !== false : !disabledTours.includes(item.id)),
    );
    return [...(world?.items.map(worldItem) ?? []), ...kept];
}

/**
 * The world's onboarding (`onboardingUrl`), with its broken items left out. Undefined without one, or when it does not
 * load: the built-in items still run.
 */
export async function loadWorldOnboarding(url: string | undefined): Promise<OnboardingData | undefined> {
    if (!url) {
        return undefined;
    }
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const { data, errors } = parseOnboardingData(await response.json());
        for (const error of errors) {
            console.warn(`Onboarding of this world (${url}): ${error}`);
        }
        return data;
    } catch (error) {
        console.warn(`The onboarding of this world (${url}) did not load: only the built-in items run.`, error);
        return undefined;
    }
}
