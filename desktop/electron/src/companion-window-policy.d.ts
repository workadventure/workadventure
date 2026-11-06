export type CompanionBounds = { x: number; y: number; width: number; height: number };

export const COMPANION_MIN_WIDTH: number;
export const COMPANION_MIN_HEIGHT: number;
export function normalizeCompanionBounds(
    savedBounds: Partial<CompanionBounds> | undefined,
    workArea: CompanionBounds,
    defaultSize?: { width: number; height: number },
    margin?: number
): CompanionBounds;
