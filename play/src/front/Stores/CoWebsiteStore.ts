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

    // private _onResize: Subject<void> = new Subject();
    // public onResize = this._onResize.asObservable();

    constructor() {
        // Ajouter des écouteurs d'événements pour la mise à jour des stores
        window.addEventListener('resize', this.handleResize.bind(this));

        // Nettoyer les écouteurs d'événements lorsque ce n'est plus nécessaire
        this.cleanupStore = () => {
            window.removeEventListener('resize', this.handleResize.bind(this));
        };
    }

    cleanupStore() {
        window.removeEventListener('resize', this.handleResize.bind(this));
    }

    handleResize() {
        widthContainer.set(window.innerWidth);
        heightContainer.set(window.innerHeight);
        canvasWidth.set(window.innerWidth);
        canvasHeight.set(window.innerHeight);
    }


    get verticalMode(): boolean {
        return window.innerWidth < window.innerHeight;
    }

    private isResizingFromCoWebsite: boolean = false;

    public setResizingFromCoWebsite(value: boolean) {
        this.isResizingFromCoWebsite = value;
    }

    // c'est la la merde

    private calculateNewWidth() {
        let currentWidthContainer = get(widthContainer);
        console.log("currentWidth CONTAINER before function", currentWidthContainer);

        let currentWidthCanvas = get(canvasWidth);
        console.log("currentWidth CANVAS before function", currentWidthCanvas);

        if (!this.verticalMode && this.isResizingFromCoWebsite && get(coWebsites).length > 0) {
            console.log("je suis dans le resize CO WEBSITE");
            canvasWidth.set(window.innerWidth - get(widthContainer));
            return window.innerWidth - get(widthContainer);
        } else if (!this.verticalMode && !this.isResizingFromCoWebsite && get(coWebsites).length > 0) {
            canvasWidth.set(window.innerWidth - get(canvasWidth));
            return window.innerWidth - get(canvasWidth);
        } else {
            return window.innerWidth - currentWidthContainer;
        }
    }


    private calculateNewHeight() {
        if (this.isResizingFromCoWebsite && this.verticalMode && get(coWebsites).length > 0) {
            canvasHeight.set(window.innerHeight - get(heightContainer));
            return window.innerHeight - get(heightContainer);
        } else if (!this.isResizingFromCoWebsite && this.verticalMode && get(coWebsites).length > 0) {
            return window.innerHeight - get(heightContainer);
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
        this.closeCoWebsites
    }

    // public resizeObserver = new ResizeObserver(() => {
    //     this.fire();
    // });

    // private fire(): void {
    //     this._onResize.next();
    //     waScaleManager.applyNewSize();
    //     // TODO: this line because the refresh focus should be emited with an event
    //     waScaleManager.refreshFocusOnTarget(gameManager.getCurrentGameScene().cameras.main);
    // }

}

export const coWebsiteManager = new CoWebsiteManager();
