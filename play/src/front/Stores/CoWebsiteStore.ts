import { derived, get, Unsubscriber, writable } from "svelte/store";
import type { CoWebsite } from "../WebRtc/CoWebsite/CoWebsite";
import type { Writable } from "svelte/store";



function createCoWebsiteStore() {
    const { subscribe, set, update } = writable(Array<CoWebsite>());

    set(Array<CoWebsite>());
    const unsubscribers = new Map<string, Unsubscriber>();

    return {
        subscribe,
        add: (coWebsite: CoWebsite, position?: number) => {
            unsubscribers.set(
                coWebsite.getId(),
                coWebsite.getStateSubscriber().subscribe(() => {
                    update((currentArray) => currentArray);
                })

            );

            if (position || position === 0) {
                update((currentArray) => {
                    if (position === 0) {
                        return [coWebsite, ...currentArray];
                    } else if (currentArray.length > position) {
                        return [...currentArray.splice(position, 0, coWebsite)];
                    }

                    console.log(currentArray.length)
                    return [...currentArray, coWebsite];
                });
                return;
            }
            update((currentArray) => [...currentArray, coWebsite]);
        },
        remove: (coWebsite: CoWebsite) => {
            unsubscribers.get(coWebsite.getId())?.();
            unsubscribers.delete(coWebsite.getId());
            update((currentArray) => [
                ...currentArray.filter((currentCoWebsite) => currentCoWebsite.getId() !== coWebsite.getId()),
            ]);
        },
        empty: () => {
            unsubscribers.forEach((unsubscriber) => unsubscriber());
            unsubscribers.clear();
            set(Array<CoWebsite>());
        },
    };
}


export const coWebsites = createCoWebsiteStore();

export const coWebsitesNotAsleep = derived([coWebsites], ([$coWebsites]) =>
    $coWebsites.filter((coWebsite) => coWebsite.getState() !== "asleep")
);

export const mainCoWebsite = derived([coWebsites], ([$coWebsites]) =>
    $coWebsites.find((coWebsite) => coWebsite.getState() !== "asleep")
);







export enum iframeStates {
    closed = 1,
    loading, // loading an iframe can be slow, so we show some placeholder until it is ready
    opened,
}
// const activeTab = writable(true);

export class CoWebsiteManager {

    private openedMain: Writable<iframeStates> = writable(iframeStates.closed);

    public displayMain() {
        const coWebsite = this.getMainCoWebsite();
        console.log(coWebsite);
        if (coWebsite) {
            const iframe = coWebsite.getIframe();
            if (iframe) {
                iframe.style.display = "block";
            }
        }
        // let others = get(coWebsites).filter((coWebsite) => coWebsite.getState() === "asleep");
        // console.log(others);
        // this.loadMain(coWebsite?.getWidthPercent());
        // this.openMain();
        // this.fire();
    }


    public getMainState() {
        // console.log("je suis dans la fonction getMainState");
        return get(this.openedMain);
    }

    public getMainCoWebsite(): CoWebsite | undefined {
        // console.log("je suis dans la fonction getMainCoWebsite", mainCoWebsite);
        return get(mainCoWebsite);
    }

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





    public addCoWebsiteToStore(coWebsite: CoWebsite) {
        // console.log("je suis dans la fonction add to store cowebsite");
        coWebsites.add(coWebsite);
        // console.log(coWebsite.getState());
    }

    public loadCoWebsite(coWebsite: CoWebsite) {
        coWebsite.load();
        // console.log("je suis dans la fonction load cowebsite");
    }

    public removeCoWebsiteToStore(coWebsite: CoWebsite) {
        // console.log("je suis dans la fonction remove to store cowebsite");
        coWebsites.remove(coWebsite);
        // console.log(coWebsites);
    }



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
