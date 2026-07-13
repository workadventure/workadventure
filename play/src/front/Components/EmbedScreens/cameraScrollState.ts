export interface CameraScrollMetrics {
    scrollLeft: number;
    scrollTop: number;
    scrollWidth: number;
    scrollHeight: number;
    clientWidth: number;
    clientHeight: number;
}

export interface CameraScrollState {
    canScrollLeft: boolean;
    canScrollRight: boolean;
    canScrollTop: boolean;
    canScrollBottom: boolean;
    shouldStartAlign: boolean;
}

const SCROLL_THRESHOLD = 4;

export function computeCameraScrollState(
    metrics: CameraScrollMetrics,
    isOnOneLine: boolean,
    oneLineMode: "vertical" | "horizontal",
): CameraScrollState {
    const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = metrics;

    if (isOnOneLine && oneLineMode === "horizontal") {
        const hasHorizontalOverflow = scrollWidth > clientWidth;
        return {
            canScrollLeft: hasHorizontalOverflow && scrollLeft > SCROLL_THRESHOLD,
            canScrollRight: hasHorizontalOverflow && scrollLeft < scrollWidth - clientWidth - SCROLL_THRESHOLD,
            canScrollTop: false,
            canScrollBottom: false,
            shouldStartAlign: hasHorizontalOverflow,
        };
    }

    const hasVerticalOverflow = scrollHeight > clientHeight;
    return {
        canScrollLeft: false,
        canScrollRight: false,
        canScrollTop: hasVerticalOverflow && scrollTop > SCROLL_THRESHOLD,
        canScrollBottom: hasVerticalOverflow && scrollTop < scrollHeight - clientHeight - SCROLL_THRESHOLD,
        shouldStartAlign: false,
    };
}
