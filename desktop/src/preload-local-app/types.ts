export type Server = {
    _id: string;
    name: string;
    url: string;
};

export type WorkAdventureLocalAppApi = {
    desktop: boolean;
    isDevelopment: () => Promise<boolean>;
    showLocalApp: () => Promise<void>;
    getServers: () => Promise<Server[]>;
    selectServer: (serverId: string) => Promise<Error | boolean>;
    addServer: (server: Omit<Server, "_id">) => Promise<Server>;
    removeServer: (serverId: Server["_id"]) => Promise<boolean>;
};
