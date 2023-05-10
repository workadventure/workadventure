import { MapStore } from "@workadventure/store-utils";
import { JitsiConferenceWrapper } from "./JitsiConferenceWrapper";

/**
 * A store that contains the list of Jitsi conferences a user is part of
 */
export const jitsiConferencesStore = new MapStore<string, JitsiConferenceWrapper>();
