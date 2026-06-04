import { writable } from "svelte/store";

export type CommunicationProvider = "livekit" | "webrtc";

export const activeCommunicationProviderStore = writable<CommunicationProvider | undefined>(undefined);
