import { get, writable } from "svelte/store";
import type { CoWebsite } from "../WebRtc/CoWebsite/CoWebsite";
import { Subject } from "rxjs";



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
        update((currentArray) => currentArray.filter((currentCoWebsite) => currentCoWebsite.getId() !== coWebsite.getId()));
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


export let widthContainer = writable(window.innerWidth);
export let heightContainer = writable(window.innerHeight);
export class CoWebsiteManager {

    private _onResize: Subject<void> = new Subject();
    public onResize = this._onResize.asObservable();


    get verticalMode(): boolean {
        return window.innerWidth < window.innerHeight;
    }


    calculateNewWidth() {
        const currentWidth = get(widthContainer);
        if (!this.verticalMode && get(coWebsites).length > 0){
            return window.innerWidth - currentWidth;
        }
        return window.innerWidth
    }

    calculateNewHeight() {
        const currentHeight = get(heightContainer);
        if(this.verticalMode && get(coWebsites).length > 0) {
            return window.innerHeight - currentHeight;
        }
        return window.innerHeight
    }



    public getGameSize(): {height:number, width:number} {
        const height = this.calculateNewHeight() || 0;
        const width = this.calculateNewWidth() || 0;

        if (height !== undefined) {
            heightContainer.set(height);
        }
        if (width !== undefined) {
            widthContainer.set(width);
        }

        return {
            height: height,
            width: width
        }
    }

    // public setWidthPercent(coWebsite: CoWebsite, openingWidth?: number) {
    //     let newWidth = openingWidth ?? 50;
    //     if (newWidth > 75) {
    //         coWebsite.getWidthPercent() = 75;
    //     } else if (newWidth < 25){
    //         coWebsite.getWidthPercent() = 25;
    //     }
    // this.calculateNewWidth()

    //     coWebsite.getWidthPercent(newWidth);
    // }


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
        return new Promise<void>((resolve, reject) => {
        });
    }

    // Fonction dans la game scene

    public cleanup(): void {
        this.closeCoWebsites();
    }

}


export const coWebsiteManager = new CoWebsiteManager;
