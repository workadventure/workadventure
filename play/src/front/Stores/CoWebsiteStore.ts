import { get, writable } from "svelte/store";
import type { CoWebsite } from "../WebRtc/CoWebsite/CoWebsite";
import { Subject } from "rxjs";
import { waScaleManager } from "../Phaser/Services/WaScaleManager";


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


export let widthContainerFinal = writable(0);
export class CoWebsiteManager {

    private _onResize: Subject<void> = new Subject();
    public onResize = this._onResize.asObservable();


    get verticalMode(): boolean {
        return window.innerWidth < window.innerHeight;
    }

    public fire(): void {
        console.log("je suis dans la fonction fire cowebsite manager")
        // this._onResize.next();
        waScaleManager.applyNewSize();
        waScaleManager.refreshFocusOnTarget();
    }

    public addCoWebsiteToStore(coWebsite: CoWebsite) {
        coWebsites.add(coWebsite);
        this.fire()
        console.log("cowebsite add to store")
    }

    public removeCoWebsiteToStore(coWebsite: CoWebsite) {
        coWebsites.remove(coWebsite);
        this.fire()
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

    public getGameSize(): { width: number; height: number } {
        const widthContainerValue = get(widthContainerFinal);
        console.log("VALEUR DU STORE DANS FICHIER TS", widthContainerValue)
        return {
            width: window.innerWidth - widthContainerValue,
            height: window.innerHeight
        };
    }
    // public getGameSize(): { width: number; height: number } {
    //     return {
    //         height: window.innerHeight,
    //         width: window.innerWidth - $widthContainer
    //     }
    //     console.log("je suis dans la fonction getGameSIze")
    //     if (!this.verticalMode) {
    //         if(this.container) {
    //             console.log("il y a un container")
    //             console.log(window.innerWidth - this.container.offsetWidth)
    //         }

    //         return {
    //             width: this.container ? window.innerWidth - this.container.offsetWidth : window.innerWidth,
    //             height: window.innerHeight,
    //         };
    //          // chopper la taille du conteneur des cowebsite
    //     } else {
    //         return {
    //             width: window.innerWidth,
    //             height: this.container ? window.innerHeight - this.container.offsetHeight : window.innerHeight, // chopper la height du conteneur des cowebsites
    //         };
    //     }


    // Fonction dans la game scene

    public cleanup(): void {
        this.closeCoWebsites();
    }

}

// document.addEventListener("DOMContentLoaded", function() {
//     const container = document.getElementById("cowebsites-container");
//     const coWebsiteManager = new CoWebsiteManager(container as HTMLElement);
// });

// const container = document.getElementById("cowebsites-container"); // Obtenez la référence du conteneur


export const coWebsiteManager = new CoWebsiteManager;
