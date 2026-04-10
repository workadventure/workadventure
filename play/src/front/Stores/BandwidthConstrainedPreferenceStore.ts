import { writable } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";
import type { BandwidthConstrainedPreference } from "../Connection/LocalUserStore";

function createBandwidthConstrainedPreferenceStore() {
    const { subscribe, set } = writable<BandwidthConstrainedPreference>(
        localUserStore.getBandwidthConstrainedScreenSharePreference()
    );

    return {
        subscribe,
        setPreference: (preference: BandwidthConstrainedPreference) => {
            set(preference);
            localUserStore.setBandwidthConstrainedScreenSharePreference(preference);
        },
    };
}

export const bandwidthConstrainedPreferenceStore = createBandwidthConstrainedPreferenceStore();
