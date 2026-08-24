import { derived, get, readable, writable } from "svelte/store";
import type { CoWebsite } from "../WebRtc/CoWebsite/CoWebsite";
import type { CowebsiteOpenedAnalyticsContext } from "../Administration/CowebsiteAnalyticsProperties";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { TimedEventsByKey } from "../Administration/TimedAnalyticsEvent";

export function createCoWebsiteStore() {
    const { subscribe, update } = writable<Array<CoWebsite>>([]);

    /**
     * How long each open cowebsite has been open, one interval per id.
     *
     * Here rather than on the analytics client because the pairing is here: this store
     * is the only thing that knows a cowebsite went away, and closeRemoved below
     * already computes exactly that. The client kept a parallel map of the same ids,
     * which only stayed correct for as long as every removal remembered to tell it.
     */
    const openVisits = new TimedEventsByKey();

    /**
     * Every cowebsite in the app is opened through here, which is why the
     * `cowebsite.opened` event is reported here. The callers used to report it
     * themselves, right after calling this — five of them, each rebuilding the same
     * context literal, and seven other call sites that simply forgot. What a caller
     * still owns is the context it alone knows: which area triggered the open, and
     * through which property.
     *
     * It really is the only emitter now: `WA.nav.openTab`, `WA.nav.goToPage`,
     * `WA.ui.website` and embedded websites used to report `cowebsite.opened` too,
     * and none of them opens a cowebsite — they open a browser tab, a navigation, or
     * an iframe this store never sees. They report `scripting.website_opened`
     * instead, so the per-area figures computed from this event stop being diluted by
     * context-less rows.
     */
    const add = (coWebsite: CoWebsite, position?: number, analyticsContext: CowebsiteOpenedAnalyticsContext = {}) => {
        if (position || position === 0) {
            update((currentArray) => {
                const newArray = [...currentArray];
                if (position === 0) {
                    newArray.unshift(coWebsite);
                } else if (currentArray.length > position) {
                    newArray.splice(position, 0, coWebsite);
                } else {
                    newArray.push(coWebsite);
                }
                return newArray;
            });
        } else {
            update((currentArray) => [...currentArray, coWebsite]);
        }
        if (get({ subscribe }).length === 1) {
            const coWebsiteWidthPercent = coWebsite.getWidthPercent();
            if (coWebsiteWidthPercent) {
                coWebsiteRatio.set(coWebsiteWidthPercent / 100);
            } else {
                coWebsiteRatio.set(0.5);
            }
        }

        openVisits.replace(coWebsite.getId(), analyticsClient.openedWebsite(coWebsite.getUrl(), analyticsContext));
    };

    /**
     * Closes the analytics interval of every cowebsite that just went away.
     *
     * By diff rather than by the caller telling us, because three of the four removal
     * functions do not know what they removed: keepOnly() takes a predicate,
     * removeAll() and empty() take nothing. Sixteen call sites remove a cowebsite and
     * exactly one of them used to report a close, which is why cowebsite.closed sat
     * near zero.
     */
    const closeRemoved = (before: Array<CoWebsite>, after: Array<CoWebsite>) => {
        const kept = new Set(after.map((coWebsite) => coWebsite.getId()));
        for (const coWebsite of before) {
            if (!kept.has(coWebsite.getId())) {
                openVisits.close(coWebsite.getId());
            }
        }
    };

    const removeMatching = (keep: (coWebsite: CoWebsite) => boolean) => {
        update((currentArray) => {
            const remaining = currentArray.filter(keep);
            closeRemoved(currentArray, remaining);
            return remaining;
        });
    };

    const remove = (coWebsite: CoWebsite) => {
        removeMatching((currentCoWebsite) => currentCoWebsite.getId() !== coWebsite.getId());
    };

    const removeAll = () => {
        removeMatching(() => false);
    };

    /**
     * Only keep the cowebsites matching the predicate.
     */
    const keepOnly = (predicate: (coWebsite: CoWebsite) => boolean) => {
        removeMatching(predicate);
    };

    const findById = (id: string) => {
        return get({ subscribe }).find((coWebsite) => coWebsite.getId() === id);
    };

    const empty = () => removeMatching(() => false);

    return {
        subscribe,
        add,
        remove,
        removeAll,
        empty,
        keepOnly,
        findById,
    };
}

export const coWebsites = createCoWebsiteStore();

export const fullScreenCowebsite = writable(false);

export const windowSize = readable({ width: window.innerWidth, height: window.innerHeight }, (set) => {
    const handleResize = () => {
        set({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => {
        window.removeEventListener("resize", handleResize);
    };
});

export const coWebsiteRatio = writable(0.5);

export const canvasSize = derived(
    [coWebsites, windowSize, coWebsiteRatio, fullScreenCowebsite],
    ([$coWebsites, $windowSize, $coWebsiteRatio, $fullScreenCowebsite]) => {
        if ($coWebsites.length === 0) {
            return { width: window.innerWidth, height: window.innerHeight };
        }
        if ($fullScreenCowebsite) {
            return {
                width: 0,
                height: 0,
            };
        }
        if ($windowSize.width <= $windowSize.height) {
            return {
                width: $windowSize.width,
                height: $windowSize.height * (1 - $coWebsiteRatio),
            };
        } else {
            return {
                width: $windowSize.width * (1 - $coWebsiteRatio),
                height: $windowSize.height,
            };
        }
    },
);

export const coWebsitesSize = derived(
    [coWebsites, windowSize, coWebsiteRatio],
    ([$coWebsites, $windowSize, $coWebsiteRatio]) => {
        if ($coWebsites.length === 0) {
            return { width: 0, height: 0 };
        }
        if ($windowSize.width <= $windowSize.height) {
            return {
                width: $windowSize.width,
                height: $windowSize.height * $coWebsiteRatio,
            };
        } else {
            return {
                width: $windowSize.width * $coWebsiteRatio,
                height: $windowSize.height,
            };
        }
    },
);

export class CoWebsiteManager {
    get verticalMode(): boolean {
        return window.innerWidth <= window.innerHeight;
    }

    // FIXME: can we use stores to recompute this instead?
    private calculateNewWidth() {
        if (!this.verticalMode && get(coWebsites).length > 0) {
            return Math.round(window.innerWidth * (1 - get(coWebsiteRatio)));
        } else {
            return window.innerWidth;
        }
    }

    private calculateNewHeight() {
        if (this.verticalMode && get(coWebsites).length > 0) {
            return Math.round(window.innerHeight - (1 - get(coWebsiteRatio)));
        } else {
            return window.innerHeight;
        }
    }

    public getGameSize(): { height: number; width: number } {
        // FIXME: replace this with a subscription to the store
        return get(canvasSize);
    }

    public generateUniqueId() {
        let id = undefined;
        do {
            id = "cowebsite-iframe-" + (Math.random() + 1).toString(36).substring(7);
        } while (coWebsites.findById(id));

        return id;
    }

    public cleanup(): void {
        coWebsites.removeAll();
    }
}

export const coWebsiteManager = new CoWebsiteManager();
