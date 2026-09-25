export type DesktopWindowState = {
    x?: number;
    y?: number;
    isMaximized?: boolean;
    isFullScreen?: boolean;
};

export function shouldMaximizeBeforeLoad(windowState: DesktopWindowState): boolean;
