import { get, writable } from "svelte/store";
import type { CoWebsite } from "../WebRtc/CoWebsite/CoWebsite";

// nouveau store

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


    // Adding fonction for duplicate coWebsite and tab in store

    // const duplicate = (coWebsite: CoWebsite) => {
    //     coWebsite = Object.assign({}, coWebsite);
        // const newCoWebsite = coWebsite.clone();
        // add(newCoWebsite);
        // add(coWebsite);
    // }


    // const duplicate = (coWebsite: CoWebsite) => {
    //     add(coWebsite.clone());
    // }

    return {
        subscribe,
        add,
        remove,
        empty,
        // duplicate
    };
}



export const coWebsites = createCoWebsiteStore();

// export const coWebsitesNotAsleep = derived([coWebsites], ([$coWebsites]) =>
//     $coWebsites.filter((coWebsite) => coWebsite.getState() !== "asleep")
// );

// export const mainCoWebsite = derived([coWebsites], ([$coWebsites]) =>
//     $coWebsites.find((coWebsite) => coWebsite.getState() !== "asleep")
// );







// export enum iframeStates {
//     closed = 1,
//     loading, // loading an iframe can be slow, so we show some placeholder until it is ready
//     opened,
// }


// const cowebsiteDomId = "cowebsites-container";


export class CoWebsiteManager {


//Méthode pour ajout load et retrait au store
    public addCoWebsiteToStore(coWebsite: CoWebsite) {
        coWebsites.add(coWebsite);
    }

    public loadCoWebsite(coWebsite: CoWebsite) {
        coWebsite.load().catch(() => {"error"});
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

    public getCoWebsiteById(coWebsiteId: string): CoWebsite | undefined {
        return get(coWebsites).find((coWebsite: CoWebsite) => {
            return coWebsite.getId() === coWebsiteId;
        });
    }

    public getCoWebsites() {
        return get(coWebsites);
    }

    public getCoWebsiteBuffer(): HTMLDivElement {
        console.log("method cowebsite buffer")
        // return this.cowebsiteBufferDom;
    }

    public closeCoWebsites(): void {
        get(coWebsites).forEach((coWebsite: CoWebsite) => {
            this.closeCoWebsite(coWebsite);
        });
    }


    public closeCoWebsite(coWebsite: CoWebsite): void {
        this.removeCoWebsiteToStore(coWebsite);
        // coWebsites.remove(coWebsite);
        // console.log(coWebsites);
    }


    public unloadCoWebsite(coWebsite: CoWebsite): Promise<void> {
        // this.removeHighlightCoWebsite(coWebsite);

        // return coWebsite
        //     .unload()
        //     .then(async () => {
        //         await randomDelay();

        //         coWebsites.remove(coWebsite);
        //         const mainCoWebsite = this.getMainCoWebsite();

        //         if (mainCoWebsite) {
        //             this.removeHighlightCoWebsite(mainCoWebsite);
        //             this.goToMain(mainCoWebsite);
        //             this.resizeAllIframes();
        //         } else {
        //             this.closeMain();
        //         }

        //         coWebsites.add(coWebsite, get(coWebsites).length);
        //     })
        //     .catch(() => {
        //         console.error();
        //     });
    }
}

export const coWebsiteManager = new CoWebsiteManager();
