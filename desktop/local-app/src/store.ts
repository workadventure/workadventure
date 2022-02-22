import { writable, get } from "svelte/store";
import { api, Server } from "~/lib/ipc";

export const newServer = writable<Omit<Server, "_id">>({
    name: "",
    url: "",
});
export const servers = writable<Server[]>([]);
export const selectedServer = writable<string>("");

export async function selectServer(serverId: string) {
    await api.selectServer(serverId);
    selectedServer.set(serverId);
}

export async function addServer() {
    const addedServer = await api.addServer(get(newServer));
    if (addedServer instanceof Error) {
        throw new Error(addedServer as unknown as string);
    }
    newServer.set({ name: "", url: "" });
    servers.update((s) => [...s, addedServer]);
    await selectServer(addedServer._id);
}

export async function loadServers() {
    servers.set(await api.getServers());
}
