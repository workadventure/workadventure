import { writable, get } from "svelte/store";
import { api, Server } from "~/lib/ipc";

export const newServer = writable<Omit<Server, "_id">>({
    name: "",
    url: "",
});
export const servers = writable<Server[]>([]);
export const selectedServer = writable<string | undefined>("");

export async function selectServer(server: Server) {
    await api.selectServer(server._id);
    selectedServer.set(server._id);
}

export async function addServer() {
    const addedServer = await api.addServer(get(newServer));
    if (addedServer instanceof Error) {
        throw new Error(addedServer as unknown as string);
    }
    newServer.set({ name: "", url: "" });
    servers.update((s) => [...s, addedServer]);
    await selectServer(addedServer);
}

export async function loadServers() {
    servers.set(await api.getServers());
}
