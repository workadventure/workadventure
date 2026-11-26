export interface DesktopWindowState {
    focused: boolean;
    visible: boolean;
    minimized: boolean;
}

export interface DesktopWindowStateProvider {
    isFocused(): boolean;
    isVisible(): boolean;
    isMinimized(): boolean;
}

function createDesktopWindowState(window?: DesktopWindowStateProvider): DesktopWindowState {
    if (!window) {
        return {
            focused: false,
            visible: false,
            minimized: false,
        };
    }

    return {
        focused: window.isFocused(),
        visible: window.isVisible(),
        minimized: window.isMinimized(),
    };
}

export { createDesktopWindowState };
