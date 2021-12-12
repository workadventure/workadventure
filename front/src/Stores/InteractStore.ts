import { writable } from "svelte/store";

export const followStates = {
    off: "off",
    requesting: "requesting",
    active: "active",
    ending: "ending",
};

export const followRoles = {
    leader: "leader",
    follower: "follower",
};

export const followStateStore = writable(followStates.off);
export const followRoleStore = writable(followRoles.leader);
export const followUsersStore = writable<string[]>([]);
