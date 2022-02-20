import { writable, get } from "svelte/store";

type Server = {
    _id: string;
    name: string;
    url: string;
};

export const newServer = writable<Omit<Server, "_id">>({
    name: "",
    url: "",
});
export const servers = writable<Server[]>([]);
export const selectedServer = writable<string | undefined>(undefined);

export async function selectServer(server: Server) {
    await window.WorkAdventureDesktopApi.selectServer(server._id);
    selectedServer.set(server._id);
}

export async function addServer(event: Event) {
    const addedServer = await window?.WorkAdventureDesktopApi?.addServer(get(newServer));
    newServer.set({ name: "", url: "" });
    servers.update((s) => [...s, addedServer]);
    await selectServer(addedServer);
}

export async function loadServers() {
    servers.set(await window.WorkAdventureDesktopApi.getServers());
}
