import { derived, get, readable, writable } from "svelte/store";
import type { CoWebsite } from "../WebRtc/CoWebsite/CoWebsite";

export function createCoWebsiteStore() {
    const { subscribe, set, update } = writable<Array<CoWebsite>>([]);

    const add = (coWebsite: CoWebsite, position?: number) => {
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
    };

    const remove = (coWebsite: CoWebsite) => {
        update((currentArray) =>
            currentArray.filter((currentCoWebsite) => currentCoWebsite.getId() !== coWebsite.getId())
        );
    };

    const removeAll = () => {
        set([]);
    };

    /**
     * Only keep the cowebsites matching the predicate.
     */
    const keepOnly = (predicate: (coWebsite: CoWebsite) => boolean) => {
        update((currentArray) => currentArray.filter(predicate));
    };

    const findById = (id: string) => {
        return get({ subscribe }).find((coWebsite) => coWebsite.getId() === id);
    };

    const empty = () => set([]);

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
    }
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
    }
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
