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

export function createDesktopWindowState(window?: DesktopWindowStateProvider): DesktopWindowState;
