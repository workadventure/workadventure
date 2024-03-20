import { get, writable } from "svelte/store";
import type { CoWebsite } from "../WebRtc/CoWebsite/CoWebsite";
import type { Writable } from "svelte/store";

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
    // }s


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

//ancien store

// function createCoWebsiteStore() {
//     const { subscribe, set, update } = writable(Array<CoWebsite>());

//     set(Array<CoWebsite>());
//     const unsubscribers = new Map<string, Unsubscriber>();

//     return {
//         subscribe,
//         add: (coWebsite: CoWebsite, position?: number) => {
//             unsubscribers.set(
//                 coWebsite.getId(),
//                 coWebsite.getStateSubscriber().subscribe(() => {
//                     update((currentArray) => currentArray);
//                 })

//             );

//             if (position || position === 0) {
//                 update((currentArray) => {
//                     if (position === 0) {
//                         return [coWebsite, ...currentArray];
//                     } else if (currentArray.length > position) {
//                         return [...currentArray.splice(position, 0, coWebsite)];
//                     }

//                     console.log(currentArray.length)
//                     return [...currentArray, coWebsite];
//                 });
//                 return;
//             }
//             update((currentArray) => [...currentArray, coWebsite]);
//         },
//         remove: (coWebsite: CoWebsite) => {
//             unsubscribers.get(coWebsite.getId())?.();
//             unsubscribers.delete(coWebsite.getId());
//             update((currentArray) => [
//                 ...currentArray.filter((currentCoWebsite) => currentCoWebsite.getId() !== coWebsite.getId()),
//             ]);
//         },
//         empty: () => {
//             unsubscribers.forEach((unsubscriber) => unsubscriber());
//             unsubscribers.clear();
//             set(Array<CoWebsite>());
//         },
//     };
// }


export const coWebsites = createCoWebsiteStore();

// export const coWebsitesNotAsleep = derived([coWebsites], ([$coWebsites]) =>
//     $coWebsites.filter((coWebsite) => coWebsite.getState() !== "asleep")
// );

// export const mainCoWebsite = derived([coWebsites], ([$coWebsites]) =>
//     $coWebsites.find((coWebsite) => coWebsite.getState() !== "asleep")
// );







export enum iframeStates {
    closed = 1,
    loading, // loading an iframe can be slow, so we show some placeholder until it is ready
    opened,
}


// const cowebsiteDomId = "cowebsites-container";


export class CoWebsiteManager {


    // private cowebsiteDom: HTMLDivElement;
    private openedMain: Writable<iframeStates> = writable(iframeStates.closed);
    // private vertical: boolean = false;
    // private verticalStore = writable(this.vertical);

    // constructor() {
    //     this.cowebsiteDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteDomId);
    // }


//Méthode pour le full screen


    // public toggleFullScreenCowebsite(value: boolean) {
    //     this.vertical = value;
    //     this.verticalStore.set(value);
    // }

    // public toggleFullScreen() {
    //     this.setVertical(true);
    // }

    // get width(): number {
    //     return this.cowebsiteDom.clientWidth;
    // }

    // set width(width: number) {
    //     this.cowebsiteDom.style.width = width + "px";
    // }

    // get height(): number {
    //     return this.cowebsiteDom.clientHeight;
    // }

    // set height(height: number) {
    //     this.cowebsiteDom.style.height = height + "px";
    // }

    // get verticalMode(): boolean {
    //     return window.innerWidth < window.innerHeight;
    // }

    // get isFullScreen(): boolean {
    //     return this.verticalMode ? this.height === window.innerHeight : this.width === window.innerWidth;
    // }


//Méthode pour ajout load et retrait au store
    public addCoWebsiteToStore(coWebsite: CoWebsite) {
        coWebsites.add(coWebsite);
    }

    public loadCoWebsite(coWebsite: CoWebsite) {
        coWebsite.load().catch(() => {"error"});
    }

    public removeCoWebsiteToStore(coWebsite: CoWebsite) {
        console.log("removeCoWebsiteToStore")
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



    // Autres fonctions que je n'utilise pas pour le moment


    // public toggleFullscreen(): void {
    //     if (this.isFullScreen) {
    //         this.toggleFullScreenIcon(true);
    //         this.restoreMainSize();
    //         this.fire();
    //         //we don't trigger a resize of the phaser game since it won't be visible anyway.
    //     } else {
    //         this.toggleFullScreenIcon(false);
    //         this.verticalMode ? (this.height = window.innerHeight) : (this.width = window.innerWidth);
    //         //we don't trigger a resize of the phaser game since it won't be visible anyway.
    //     }
    // }


    // public restoreMainSize() {
    //     this.verticalMode ? (this.cowebsiteDom.style.width = "") : (this.cowebsiteDom.style.height = "");
    //     this.verticalMode
    //         ? (this.height = Math.round((this.coWebsiteResizeSize * window.innerHeight) / 100))
    //         : (this.width = Math.round((this.coWebsiteResizeSize * window.innerWidth) / 100));
    // }

    // public displayMain() {
    //     const coWebsite = this.getMainCoWebsite();
    //     console.log(coWebsite);
    //     if (coWebsite) {
    //         const iframe = coWebsite.getIframe();
    //         if (iframe) {
    //             iframe.style.display = "block";
    //         }
    //     }
        // let others = get(coWebsites).filter((coWebsite) => coWebsite.getState() === "asleep");
        // console.log(others);
        // this.loadMain(coWebsite?.getWidthPercent());
        // this.openMain();
        // this.fire();
    // }


    public getMainState() {
        // console.log("je suis dans la fonction getMainState");
        return get(this.openedMain);
    }

    // public getMainCoWebsite(): CoWebsite | undefined {
    //     // console.log("je suis dans la fonction getMainCoWebsite", mainCoWebsite);
    //     return get(mainCoWebsite);
    // }

    public getCoWebsites() {
        return get(coWebsites);
    }




    // public goToMain(coWebsite: CoWebsite) {
    //     const mainCoWebsite = this.getMainCoWebsite();
    //     coWebsites.remove(coWebsite);
    //     coWebsites.add(coWebsite, 0);

    //     if (mainCoWebsite) {
    //         const iframe = mainCoWebsite.getIframe();
    //         if (iframe) {
    //             iframe.style.display = "block";
    //         }
    //     }
    // }

    //     this.fire();
    // }
    // private closeMain(): void {
    //     this.toggleFullScreenIcon(true);
    //     //this.cowebsiteDom.classList.add("closing");
    //     //this.cowebsiteDom.classList.remove("opened");
    //     this.openedMain.set(iframeStates.closed);
    //     //this.cowebsiteDom.style.height = "";
    //     //this.cowebsiteDom.style.width = "";
    //     this.coWebsiteResizeSize = 50;
    //     this.fire();
    // }


    // public closeCoWebsite(coWebsite: CoWebsite, withStack = true): void {
    //     if (get(coWebsites).length === 1) {
    //         this.fire();
    //     }
    //     this.removeCoWebsiteFromStack(coWebsite, withStack);
    //     const mainCoWebsite = this.getMainCoWebsite();
    //     if (mainCoWebsite) {
    //         this.removeHighlightCoWebsite(mainCoWebsite);
    //         this.goToMain(mainCoWebsite);
    //         this.resizeAllIframes();
    //     } else {
    //         this.closeMain();
    //     }
    // }
    // goToMain(embed: CoWebsite) {
    //     throw new Error("Method not implemented.");
    // }
    // hideMain() {
    //     throw new Error("Method not implemented.");
    // }
    // displayMain() {
    //     throw new Error("Method not implemented.");
    // }








    // public closeCoWebsite(coWebsite: CoWebsite, withStack = true): void {
    //     if (get(coWebsites).length === 1) {
    //         this.fire();
    //     }

    //     this.removeCoWebsiteFromStack(coWebsite, withStack);

    //     const mainCoWebsite = this.getMainCoWebsite();

    //     if (mainCoWebsite) {
    //         this.removeHighlightCoWebsite(mainCoWebsite);
    //         this.goToMain(mainCoWebsite);
    //         this.resizeAllIframes();
    //     } else {
    //         this.closeMain();
    //     }
    // }


    public getCoWebsiteBuffer(): HTMLDivElement {
        console.log("method cowebsite buffer")
        // throw new Error("To be reimplemented");
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





    public getMainStateSubscriber(): Readable<iframeStates> {
        console.log("je suis dans la fonction getMainStateSubscriber");
        // return this.openedMain;
    }





    // public closeCoWebsite(coWebsite: CoWebsite) {

    // }

    private resizeObserver = new ResizeObserver(() => {
        /*this.resizeAllIframes();

        if (!this.isFullScreen && this.cowebsiteAsideHolderDom.style.visibility === "hidden") {
            this.toggleFullScreenIcon(true);
            this.restoreMainSize();
            this.fire();
        }*/
    });


    // public getCoWebsiteBuffer(): HTMLDivElement {
    //     throw new Error("To be reimplemented");
        // return this.cowebsiteBufferDom;
    // }


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


    private removeHighlightCoWebsite(coWebsite: CoWebsite) {
        // const highlighted = get(highlightedEmbedScreen);

        // if (highlighted && highlighted.type === "cowebsite" && highlighted.embed.getId() === coWebsite.getId()) {
        //     highlightedEmbedScreen.removeHighlight();
        // }
    }

    // public removeCoWebsiteFromStore(coWebsite: CoWebsite) {
    //     console.log("je suis dans la fonction close from store cowebsite");
    //     // coWebsites.remove(coWebsite);
    //     // console.log(coWebsites);
    // }

    // public setActiveCoWebsite(coWebsite: CoWebsite) {
    //     // this.activeCoWebsite = coWebsite;
    //     // this.activeCoWebsiteStore.set(coWebsite);
    // }

    // public getActiveCoWebsite(): CoWebsite | null {
    //     console.log(this.activeCoWebsite);
    //     return this.activeCoWebsite;
    // }

    // public generateUniqueId() {
    //     let id = undefined;
    //     do {
    //         id = "cowebsite-iframe-" + (Math.random() + 1).toString(36).substring(7);
    //     } while (this.getCoWebsiteById(id));

    //     return id;
    // }



    // public getCoWebsiteById(coWebsiteId: string): CoWebsite | undefined {
    //     return get(coWebsites).find((coWebsite: CoWebsite) => {
    //         return coWebsite.getId() === coWebsiteId;
    //     });
    // }







    // public hideMain() {
    //     const coWebsite = this.getMainCoWebsite();
    //     if (coWebsite) {
    //         const iframe = coWebsite.getIframe();
    //         if (iframe) {
    //             iframe.style.display = "none";
    //         }
    //     }
    //     //this.cowebsiteDom.classList.add("closing");
    //     //this.cowebsiteDom.classList.remove("opened");
    //     this.openedMain.set(iframeStates.closed);
    //     this.fire();
    // }

    // private closeMain(): void {
    //     this.toggleFullScreenIcon(true);
    //     //this.cowebsiteDom.classList.add("closing");
    //     //this.cowebsiteDom.classList.remove("opened");
    //     this.openedMain.set(iframeStates.closed);
    //     //this.cowebsiteDom.style.height = "";
    //     //this.cowebsiteDom.style.width = "";
    //     this.coWebsiteResizeSize = 50;
    //     this.fire();
    // }


}

export const coWebsiteManager = new CoWebsiteManager();
