export function meetingBarDisplay(state: {
    canHideFromCapture: boolean;
    sharing: boolean;
    sharedDisplayId?: number;
    pointerDisplayId: number;
}): number | undefined;
export function companionAutoOpenDisplay(state: {
    canHideFromCapture: boolean;
    sharing: boolean;
    identifyingScreens: boolean;
    displayIds: number[];
    sharedDisplayId?: number;
    pointerDisplayId: number;
}): number | undefined;
export function companionVisibleInShare(canHideFromCapture: boolean, sharing: boolean): boolean;
