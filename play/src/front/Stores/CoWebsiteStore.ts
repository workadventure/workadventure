import { derived, get, writable } from "svelte/store";
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

export const totalTabWidth = derived(coWebsites, ($coWebsites) => {
    return $coWebsites.length * 300;
});

export const totalTabWidthMobile = derived(coWebsites, ($coWebsites) => {
    return $coWebsites.length * 220;
});

export const widthContainerForWindow = writable(0);
export const widthFromResize = writable(0);
export const heightFromResize = writable(0);
export const heightContainerForWindow = writable(0);
export const widthContainer = writable(window.innerWidth);
export const heightContainer = writable(window.innerHeight);
export const fullScreenCowebsite = writable(false);
export const canvasWidth = writable(window.innerWidth);
export const canvasHeight = writable(window.innerHeight);
export const resizeFromCowebsite = writable(false);
export const isVerticalMode = writable(false);
export const isResized = writable(false);

export class CoWebsiteManager {
    get verticalMode(): boolean {
        if (window.innerWidth <= 768) {
            return true;
        } else {
            return false;
        }
    }

    private calculateNewWidth() {
        if (!this.verticalMode && get(resizeFromCowebsite) && get(coWebsites).length > 0) {
            canvasWidth.set(window.innerWidth - get(widthContainerForWindow));
            return window.innerWidth - get(widthContainerForWindow);
        } else if (!this.verticalMode && !get(resizeFromCowebsite) && get(coWebsites).length > 0) {
            return window.innerWidth - get(widthContainerForWindow);
        } else {
            return window.innerWidth;
        }
    }

    private calculateNewHeight() {
        if (get(resizeFromCowebsite) && this.verticalMode && get(coWebsites).length > 0) {
            canvasHeight.set(window.innerHeight - get(heightContainerForWindow));
            return window.innerHeight - get(heightContainerForWindow);
        } else if (!get(resizeFromCowebsite) && this.verticalMode && get(coWebsites).length > 0) {
            return window.innerHeight - get(heightContainerForWindow);
        } else {
            return window.innerHeight;
        }
    }

    public getGameSize(): { height: number; width: number } {
        const height = this.calculateNewHeight();
        const width = this.calculateNewWidth();

        if (height !== undefined) {
            heightContainer.set(height);
        }
        if (width !== undefined) {
            widthContainer.set(width);
        }

        return {
            height: height,
            width: width,
        };
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
