export const COLLAPSED_MESSAGE_LINE_COUNT = 8;
export const FALLBACK_MESSAGE_LINE_HEIGHT = 20;

export function isMessageLongerThanCollapsedHeight(
    scrollHeight: number,
    lineHeight: number,
    collapsedLineCount = COLLAPSED_MESSAGE_LINE_COUNT,
): boolean {
    const effectiveLineHeight = Number.isNaN(lineHeight) ? FALLBACK_MESSAGE_LINE_HEIGHT : lineHeight;

    return scrollHeight > effectiveLineHeight * collapsedLineCount + 1;
}
