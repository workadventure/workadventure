import { writable } from "svelte/store";

/**
 * True while the tutorial's fake conversation (`Onboarding/SimulatedConversation.ts`) lasts. The user is then "live" as
 * in a real bubble, so their camera does not go to sleep during the demo.
 */
export const simulatedConversationStore = writable(false);
