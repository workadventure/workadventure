/** The window state electron-window-state persists. */
export type DesktopWindowState = {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    isMaximized?: boolean;
    isFullScreen?: boolean;
};

export function shouldMaximizeBeforeLoad(windowState: DesktopWindowState): boolean {
    return Boolean(
        windowState.isMaximized ||
            (!windowState.isFullScreen && (windowState.x === undefined || windowState.y === undefined))
    );
}
