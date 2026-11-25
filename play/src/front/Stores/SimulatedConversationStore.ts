import { writable } from "svelte/store";

/**
 * Set while the tutorial's fake conversation (`Onboarding/SimulatedConversation.ts`) lasts, with the fake user's video
 * once it plays. The user is then "live" as in a real bubble, so their camera does not go to sleep during the demo.
 */
export const simulatedConversationStore = writable<{ videoId?: string } | undefined>(undefined);
