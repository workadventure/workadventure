import { SettingsData } from "../settings";

export type Server = {
    _id: string;
    name: string;
    url: string;
};

export { SettingsData };

export type WorkAdventureLocalAppApi = {
    desktop: boolean;
    isDevelopment: () => Promise<boolean>;
    getVersion: () => Promise<string>;
    showLocalApp: () => Promise<void>;
    getServers: () => Promise<Server[]>;
    selectServer: (serverId: string) => Promise<Error | boolean>;
    addServer: (server: Omit<Server, "_id">) => Promise<Server | Error>;
    removeServer: (serverId: Server["_id"]) => Promise<boolean>;
    reloadShortcuts: () => Promise<void>;
    getSettings: () => Promise<SettingsData>;
    saveSetting: <T extends keyof SettingsData>(key: T, value: SettingsData[T]) => Promise<void>;
    setShortcutsEnabled: (enabled: boolean) => Promise<void>;
};
