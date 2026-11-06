import type { TranslationFunctions } from "../../../../i18n/i18n-types";

const MAX_NAMES = 5;

/**
 * "You, Camille L., Théo M. and 3 others reacted with 👍": at most 5 names, "You" first.
 * Shared by the tooltip and the aria-label of the reaction button.
 */
export function reactionTooltipText(
    LL: TranslationFunctions,
    locale: string,
    emoji: string,
    otherUsernames: string[],
    reactedByMe: boolean,
): string {
    if (reactedByMe && otherUsernames.length === 0) {
        return LL.chat.reactionTooltip.youReacted({ emoji });
    }
    const names = reactedByMe ? [LL.chat.you(), ...otherUsernames] : otherUsernames;
    if (names.length === 1) {
        return LL.chat.reactionTooltip.oneReacted({ name: names[0], emoji });
    }
    const shown = names.slice(0, MAX_NAMES);
    if (names.length > MAX_NAMES) {
        shown.push(LL.chat.reactionTooltip.others({ count: names.length - MAX_NAMES }));
    }
    return LL.chat.reactionTooltip.reacted({
        names: new Intl.ListFormat(locale, { type: "conjunction" }).format(shown),
        emoji,
    });
}
