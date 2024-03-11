import { derived, get, Unsubscriber, writable } from "svelte/store";
import type { CoWebsite } from "../WebRtc/CoWebsite/CoWebsite";



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







// const activeTab = writable(true);

class CoWebsiteManager {

    // Create store for active coWebsite

    // constructor() {
    //     this.cowebsiteDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteDomId);
    //     this.gameOverlayDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(gameOverlayDomId);
    //     this.cowebsiteBufferDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteBufferDomId);
    //     this.cowebsiteAsideHolderDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteAsideHolderDomId);
    //     this.cowebsiteLoaderDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteLoaderDomId);
    //     this.buttonCloseCoWebsite = HtmlUtils.getElementByIdOrFail(cowebsiteCloseButtonId);
    //

    private getMainCoWebsite(): CoWebsite | undefined {
        return get(mainCoWebsite);
    }

    public getCoWebsites() {
        return get(coWebsites);
    }

    public addCoWebsiteToStore(coWebsite: CoWebsite) {
        console.log("je suis dans la fonction add to store cowebsite");
        coWebsites.add(coWebsite);
        console.log(coWebsite);
    }

    public removeCoWebsiteToStore(coWebsite: CoWebsite) {
        console.log("je suis dans la fonction remove to store cowebsite");
        coWebsites.remove(coWebsite);
        console.log(coWebsite);
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


    // public closeCoWebsites(): void {
    //     get(coWebsites).forEach((coWebsite: CoWebsite) => {
    //         this.closeCoWebsite(coWebsite);
    //     });
    // }




    public displayMain() {
        console.log("je suis dans la fonction display main cowebsite")
        const coWebsite = this.getMainCoWebsite();
        if (coWebsite) {
            const iframe = coWebsite.getIframe();
            if (iframe) {
                iframe.style.display = "block";
            }
        }
        // this.loadMain(coWebsite?.getWidthPercent());
        // this.openMain();
        // this.fire();
    }




    public loadCoWebsite(coWebsite: CoWebsite) {
        // console.log("je suis dans la fonction load cowebsite");
    }

    public closeCoWebsite(coWebsite: CoWebsite) {

    }






    public removeCoWebsiteFromStore(coWebsite: CoWebsite) {
        console.log("je suis dans la fonction close from store cowebsite");
        // coWebsites.remove(coWebsite);
        // console.log(coWebsites);
    }

    public setActiveCoWebsite(coWebsite: CoWebsite) {
        // this.activeCoWebsite = coWebsite;
        // this.activeCoWebsiteStore.set(coWebsite);
    }

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
