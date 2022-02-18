export type Server = {
  _id: string;
  name: string;
  url: string;
};

export type WorkAdventureSidebarApi = {
  desktop: boolean;
  getServers: () => Promise<Server[]>;
  selectServer: (serverId: string) => Promise<Error | boolean>;
  addServer: (serverName: string, serverUrl: string) => Promise<boolean>;
};
