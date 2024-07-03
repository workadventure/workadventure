import { derived, get, writable } from "svelte/store";
import { Subject } from "rxjs";
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

    const empty = () => set([]);

    return {
        subscribe,
        add,
        remove,
        empty,
    };
}

export const coWebsites = createCoWebsiteStore();

export const totalTabWidth = derived(coWebsites, ($coWebsites) => {
    return $coWebsites.length * 300;
});

export const totalTabWidthMobile = derived(coWebsites, ($coWebsites) => {
    return $coWebsites.length * 220;
});

export const widthContainer = writable(window.innerWidth);
export const heightContainer = writable(window.innerHeight);
export const fullScreenCowebsite = writable(false);
export const canvasWidth = writable(window.innerWidth);
export const canvasHeight = writable(window.innerHeight);
export class CoWebsiteManager {


    get verticalMode(): boolean {
        return window.innerWidth < window.innerHeight;
    }


    private calculateNewWidth() {
        const currentWidth = get(widthContainer);
        if (!this.verticalMode && get(coWebsites).length > 0) {
            canvasWidth.set(window.innerWidth - currentWidth);
            return window.innerWidth - currentWidth;
        }
        return window.innerWidth;
    }

    private calculateNewHeight() {
        const currentHeight = get(heightContainer);
        if (this.verticalMode && get(coWebsites).length > 0) {
            canvasHeight.set(window.innerHeight - currentHeight);
            return window.innerHeight - currentHeight;
        }
        return window.innerHeight;
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

    public addCoWebsiteToStore(coWebsite: CoWebsite) {
        coWebsite?.getWidthPercent();
        coWebsites.add(coWebsite);
    }
    public removeCoWebsiteToStore(coWebsite: CoWebsite) {
        coWebsites.remove(coWebsite);
    }

    public generateUniqueId() {
        let id = undefined;
        do {
            id = "cowebsite-iframe-" + (Math.random() + 1).toString(36).substring(7);
        } while (this.getCoWebsiteById(id));

        return id;
    }

    public getCoWebsiteById(coWebsiteId: string): CoWebsite {
        return get(coWebsites).find((coWebsite: CoWebsite) => {
            return coWebsite.getId() === coWebsiteId;
        })!;
    }

    public getCoWebsites() {
        return get(coWebsites);
    }

    public closeCoWebsites(): void {
        get(coWebsites).forEach((coWebsite: CoWebsite) => {
            this.closeCoWebsite(coWebsite);
        });
    }

    public closeCoWebsite(coWebsite: CoWebsite): void {
        this.removeCoWebsiteToStore(coWebsite);
    }

    public unloadCoWebsite(coWebsite: CoWebsite): Promise<void> {
        return new Promise<void>((resolve, reject) => {});
    }

    public cleanup(): void {
        this.closeCoWebsites();
    }
}

export const coWebsiteManager = new CoWebsiteManager();
