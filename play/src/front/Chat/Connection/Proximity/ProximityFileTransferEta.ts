const FILE_TRANSFER_ESTIMATE_MIN_ELAPSED_MS = 2_000;
const FILE_TRANSFER_ESTIMATE_MIN_PROGRESS = 0.05;

export function estimateProximityFileTransferRemainingSeconds(progress: number, elapsedMs: number): number | undefined {
    if (
        !Number.isFinite(progress) ||
        progress < FILE_TRANSFER_ESTIMATE_MIN_PROGRESS ||
        progress >= 1 ||
        !Number.isFinite(elapsedMs) ||
        elapsedMs < FILE_TRANSFER_ESTIMATE_MIN_ELAPSED_MS
    ) {
        return undefined;
    }

    const remainingSeconds = (elapsedMs * (1 - progress)) / progress / 1_000;
    if (!Number.isFinite(remainingSeconds) || remainingSeconds <= 0) {
        return undefined;
    }

    return Math.ceil(remainingSeconds);
}

export function formatProximityFileTransferRemainingTime(remainingSeconds: number): string | undefined {
    if (!Number.isFinite(remainingSeconds) || remainingSeconds <= 0) {
        return undefined;
    }

    if (remainingSeconds < 60) {
        return `${Math.ceil(remainingSeconds)} s`;
    }

    if (remainingSeconds < 60 * 60) {
        return `${Math.ceil(remainingSeconds / 60)} min`;
    }

    return `${Math.ceil(remainingSeconds / (60 * 60))} h`;
}
