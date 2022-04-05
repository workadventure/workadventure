export type WorkAdventureDesktopApi = {
    desktop: boolean;
    isDevelopment: () => Promise<boolean>;
    getVersion: () => Promise<string>;
    notify: (txt: string) => void;
    onMuteToggle: (callback: () => void) => void;
    onCameraToggle: (callback: () => void) => void;
    getDesktopCapturerSources: (options: Electron.SourcesOptions) => Promise<Partial<Electron.DesktopCapturerSource>[]>;
};
