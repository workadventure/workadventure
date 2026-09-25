export function selectPictureInPictureHighlight<T>(
    inPictureInPicture: boolean,
    activePictureInPicture: boolean,
    screenShares: T[],
    fallback: T | undefined,
): T | undefined {
    if (!inPictureInPicture || !activePictureInPicture) {
        return fallback;
    }

    return screenShares[0] ?? fallback;
}
