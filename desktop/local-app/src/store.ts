import { writable, get } from "svelte/store";

export type Server = {
    _id: string;
    name: string;
    url: string;
};

export const newServer = writable<Omit<Server, "_id">>({
    name: "",
    url: "",
});
export const servers = writable<Server[]>([]);
export const selectedServer = writable<string | undefined>("");

export async function selectServer(server: Server) {
    await window.WorkAdventureDesktopApi.selectServer(server._id);
    selectedServer.set(server._id);
}

export async function addServer() {
    const addedServer = await window?.WorkAdventureDesktopApi?.addServer(get(newServer));
    if (!addedServer?._id) {
        console.log(addedServer);
        throw new Error(addedServer);
    }
    newServer.set({ name: "", url: "" });
    servers.update((s) => [...s, addedServer]);
    await selectServer(addedServer);
}

export async function loadServers() {
    servers.set(await window.WorkAdventureDesktopApi.getServers());
}
