export function createWorldViewWebPreferences(preloadPath: string): {
    preload: string;
    nodeIntegration: false;
    contextIsolation: true;
    sandbox: true;
    webSecurity: true;
};
