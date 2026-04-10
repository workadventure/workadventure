import { get, writable } from "svelte/store";

export interface InvitePreferences {
    entryPoint: string;
    walkAutomatically: boolean;
    showZoneSelect: boolean;
}

const initialPreferences: InvitePreferences = {
    entryPoint: "",
    walkAutomatically: false,
    showZoneSelect: false,
};

export const invitePreferencesStore = writable<InvitePreferences>({ ...initialPreferences });

export function getInviteEntryPoint(): string {
    return get(invitePreferencesStore).entryPoint;
}

export function setInviteEntryPoint(value: string): void {
    invitePreferencesStore.update((prefs) => ({ ...prefs, entryPoint: value }));
}
