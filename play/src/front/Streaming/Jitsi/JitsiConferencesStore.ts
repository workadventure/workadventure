import { JitsiConferenceWrapper } from "./JitsiConferenceWrapper";
import { MapStore } from "@workadventure/store-utils";

/**
 * A store that contains the list of Jitsi conferences a user is part of
 */
export const jitsiConferencesStore = new MapStore<string, JitsiConferenceWrapper>();
