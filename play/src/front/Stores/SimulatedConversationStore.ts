import { writable } from "svelte/store";

/**
 * The tutorial's fake conversation (`Onboarding/SimulatedConversation.ts`), while it lasts. The action bar shows the
 * media buttons and the lock button as in a real bubble.
 */
export const simulatedConversationStore = writable<{ locked: boolean } | undefined>(undefined);
