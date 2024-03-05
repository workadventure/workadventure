import { Subject } from "rxjs";
import type { Readable, Writable } from "svelte/store";
import { get, writable } from "svelte/store";
import type CancelablePromise from "cancelable-promise";
import { randomDelay } from "@workadventure/shared-utils/src/RandomDelay/RandomDelay";
import { waScaleManager } from "../Phaser/Services/WaScaleManager";
import { coWebsites, coWebsitesNotAsleep, mainCoWebsite } from "../Stores/CoWebsiteStore";
import { embedScreenLayoutStore } from "../Stores/EmbedScreensStore";
import { highlightedEmbedScreen } from "../Stores/HighlightedEmbedScreenStore";
import { isMediaBreakpointDown } from "../Utils/BreakpointsUtils";
import { gameManager } from "../Phaser/Game/GameManager";
import { LayoutMode } from "./LayoutManager";
import type { CoWebsite } from "./CoWebsite/CoWebsite";
import { HtmlUtils } from "./HtmlUtils";

export enum iframeStates {
    closed = 1,
    loading, // loading an iframe can be slow, so we show some placeholder until it is ready
    opened,
}
const cowebsiteOpenFullScreenImageId = "cowebsite-fullscreen-open";
const cowebsiteCloseFullScreenImageId = "cowebsite-fullscreen-close";
const cowebsiteSlotBaseDomId = "cowebsite-slot-";
const animationTime = 500; //time used by the css transitions, in ms.

class CoWebsiteManager {
    private openedMain: Writable<iframeStates> = writable(iframeStates.closed);

    private _onResize: Subject<void> = new Subject();
    public onResize = this._onResize.asObservable();

    private loaderAnimationInterval: {
        interval: NodeJS.Timeout | undefined;
        trails: number[] | undefined;
    };

    public getMainState() {
        return get(this.openedMain);
    }

    public getMainStateSubscriber(): Readable<iframeStates> {
        return this.openedMain;
    }

    get verticalMode(): boolean {
        return window.innerWidth < window.innerHeight;
    }

    constructor() {
        this.loaderAnimationInterval = {
            interval: undefined,
            trails: undefined,
        };
    }

    public cleanup(): void {
        this.closeCoWebsites();
    }

    public getCoWebsiteBuffer(): HTMLDivElement {
        throw new Error("To be reimplemented");
    }

    public getDevicePixelRatio(): number {
        //on chrome engines, movementX and movementY return global screens coordinates while other browser return pixels
        //so on chrome-based browser we need to adjust using 'devicePixelRatio'
        return window.navigator.userAgent.includes("Firefox") ? 1 : window.devicePixelRatio;
    }

    public displayMain() {
        const coWebsite = this.getMainCoWebsite();
        if (coWebsite) {
            const iframe = coWebsite.getIframe();
            if (iframe) {
                iframe.style.display = "block";
            }
        }
        this.loadMain();
        this.openMain();
        this.fire();
    }

    public hideMain() {
        const coWebsite = this.getMainCoWebsite();
        if (coWebsite) {
            const iframe = coWebsite.getIframe();
            if (iframe) {
                iframe.style.display = "none";
            }
        }
        this.openedMain.set(iframeStates.closed);
        this.fire();
    }

    private closeMain(): void {
        this.toggleFullScreenIcon(true);
        this.openedMain.set(iframeStates.closed);
        this.fire();
    }

    private activateMainLoaderAnimation() {
        this.desactivateMainLoaderAnimation();
        const customLogo = gameManager.currentStartedRoom.loadingCowebsiteLogo;

        if (customLogo) {
            const logo = document.createElement("img");
            logo.id = "custom-logo";
            logo.src = customLogo;
            return;
        }

        this.loaderAnimationInterval.interval = setInterval(() => {
            if (!this.loaderAnimationInterval.trails) {
                this.loaderAnimationInterval.trails = [0, 1, 2];
            }

            this.loaderAnimationInterval.trails = this.loaderAnimationInterval.trails.map((trail) =>
                trail === 3 ? 0 : trail + 1
            );
        }, 200);
    }

    private desactivateMainLoaderAnimation() {
        if (this.loaderAnimationInterval.interval) {
            //            this.cowebsiteLoaderDom.style.display = "none";
            clearInterval(this.loaderAnimationInterval.interval);
        }
    }

    private loadMain(): void {
        this.activateMainLoaderAnimation();
        this.openedMain.set(iframeStates.loading);
    }

    private openMain(): void {
        this.openedMain.set(iframeStates.opened);
    }

    public getCoWebsites(): CoWebsite[] {
        return get(coWebsites);
    }

    public getCoWebsiteById(coWebsiteId: string): CoWebsite | undefined {
        return get(coWebsites).find((coWebsite: CoWebsite) => {
            return coWebsite.getId() === coWebsiteId;
        });
    }

    private getCoWebsiteByPosition(position: number): CoWebsite | undefined {
        let i = 0;
        return get(coWebsites).find((coWebsite: CoWebsite) => {
            if (i === position) {
                return coWebsite;
            }

            i++;
            return false;
        });
    }

    private getMainCoWebsite(): CoWebsite | undefined {
        return get(mainCoWebsite);
    }

    private getPositionByCoWebsite(coWebsite: CoWebsite): number {
        return get(coWebsites).findIndex((currentCoWebsite) => {
            return currentCoWebsite.getId() === coWebsite.getId();
        });
    }

    private getSlotByCowebsite(coWebsite: CoWebsite): HTMLDivElement | undefined {
        const index = this.getPositionByCoWebsite(coWebsite);
        if (index === -1) {
            return undefined;
        }

        let id = cowebsiteSlotBaseDomId;

        if (index === 0) {
            id += "main";
        } else {
            id += coWebsite.getId();
        }

        const slot = HtmlUtils.getElementById<HTMLDivElement>(id);

        return slot;
    }

    private setIframeOffset(coWebsite: CoWebsite) {
        const coWebsiteSlot = this.getSlotByCowebsite(coWebsite);

        if (!coWebsiteSlot) {
            return;
        }

        const bounding = coWebsiteSlot.getBoundingClientRect();

        const iframe = coWebsite.getIframe();

        if (iframe) {
            iframe.style.top = bounding.top + "px";
            iframe.style.left = bounding.left + "px";
            iframe.style.width = bounding.right - bounding.left + "px";
            iframe.style.height = bounding.bottom - bounding.top + "px";
        }
    }

    public resizeAllIframes() {
        const mainCoWebsite = this.getCoWebsiteByPosition(0);
        const mainIframe = mainCoWebsite?.getIframe();
        const highlightEmbed = get(highlightedEmbedScreen);

        get(coWebsites).forEach((coWebsite: CoWebsite) => {
            const iframe = coWebsite.getIframe();
            if (!iframe) {
                return;
            }

            const notMain = !mainCoWebsite || (mainCoWebsite && mainIframe && mainIframe.id !== iframe.id);
            const notHighlighEmbed =
                !highlightEmbed ||
                (highlightEmbed &&
                    (highlightEmbed.type !== "cowebsite" ||
                        (highlightEmbed.type === "cowebsite" && highlightEmbed.embed.getId() !== coWebsite.getId())));

            if (iframe.classList.contains("main") && notMain) {
                iframe.classList.remove("main");
            }

            if (iframe.classList.contains("highlighted") && notHighlighEmbed) {
                iframe.classList.remove("highlighted");
                iframe.classList.add("pixel");
                iframe.style.top = "-1px";
                iframe.style.left = "-1px";
            }

            if (notMain && notHighlighEmbed) {
                iframe.classList.add("pixel");
                iframe.style.top = "-1px";
                iframe.style.left = "-1px";
            }

            this.setIframeOffset(coWebsite);
        });

        if (mainIframe) {
            mainIframe.classList.add("main");
            mainIframe.classList.remove("pixel");
        }

        if (highlightEmbed && highlightEmbed.type === "cowebsite") {
            const highlightEmbedIframe = highlightEmbed.embed.getIframe();
            if (highlightEmbedIframe) {
                highlightEmbedIframe.classList.add("highlighted");
                highlightEmbedIframe.classList.remove("pixel");
            }
        }
    }

    private removeHighlightCoWebsite(coWebsite: CoWebsite) {
        const highlighted = get(highlightedEmbedScreen);

        if (highlighted && highlighted.type === "cowebsite" && highlighted.embed.getId() === coWebsite.getId()) {
            highlightedEmbedScreen.removeHighlight();
        }
    }

    private removeCoWebsiteFromStack(coWebsite: CoWebsite, withStack: boolean) {
        this.removeHighlightCoWebsite(coWebsite);
        if (withStack) {
            coWebsites.remove(coWebsite);
        }

        if (get(coWebsites).length < 1) {
            this.closeMain();
        }

        coWebsite.unload().catch((err) => {
            console.error("Cannot unload cowebsite on remove from stack", err);
        });
    }

    public goToMain(coWebsite: CoWebsite) {
        const mainCoWebsite = this.getMainCoWebsite();
        coWebsites.remove(coWebsite);
        coWebsites.add(coWebsite, 0);

        if (mainCoWebsite) {
            const iframe = mainCoWebsite.getIframe();
            if (iframe) {
                iframe.style.display = "block";
            }
        }

        if (
            isMediaBreakpointDown("lg") &&
            get(embedScreenLayoutStore) === LayoutMode.Presentation &&
            mainCoWebsite &&
            mainCoWebsite.getId() !== coWebsite.getId() &&
            mainCoWebsite.getState() !== "asleep"
        ) {
            highlightedEmbedScreen.removeHighlight();
        }

        this.resizeAllIframes();
    }

    public addCoWebsiteToStore(coWebsite: CoWebsite, position: number | undefined) {
        const coWebsitePosition = position === undefined ? get(coWebsites).length : position;
        coWebsites.add(coWebsite, coWebsitePosition);
    }

    public generateUniqueId() {
        let id = undefined;
        do {
            id = "cowebsite-iframe-" + (Math.random() + 1).toString(36).substring(7);
        } while (this.getCoWebsiteById(id));

        return id;
    }

    public loadCoWebsite(coWebsite: CoWebsite): CancelablePromise<void> {
        if (get(coWebsitesNotAsleep).length < 1) {
            coWebsites.remove(coWebsite);
            coWebsites.add(coWebsite, 0);
            this.loadMain();
        }

        // Check if the main is hide
        if (this.getMainCoWebsite() && this.getMainState() === iframeStates.closed) {
            this.displayMain();
        }

        const coWebsiteLoading = coWebsite
            .load()
            .then(async () => {
                await randomDelay();
                const mainCoWebsite = this.getMainCoWebsite();
                const highlightedEmbed = get(highlightedEmbedScreen);
                if (mainCoWebsite) {
                    if (mainCoWebsite.getId() === coWebsite.getId()) {
                        this.openMain();

                        setTimeout(() => {
                            this.fire();
                        }, animationTime);

                        this.desactivateMainLoaderAnimation();
                    } else if (
                        !highlightedEmbed &&
                        this.getCoWebsites().find((searchCoWebsite) => searchCoWebsite.getId() === coWebsite.getId())
                    ) {
                        highlightedEmbedScreen.toggleHighlight({
                            type: "cowebsite",
                            embed: coWebsite,
                        });
                    }
                }
                this.resizeAllIframes();
            })
            .catch((err) => {
                console.error("Error on co-website loading => ", err);
                this.removeCoWebsiteFromStack(coWebsite, true);
            });

        return coWebsiteLoading;
    }

    public unloadCoWebsite(coWebsite: CoWebsite): Promise<void> {
        this.removeHighlightCoWebsite(coWebsite);

        return coWebsite
            .unload()
            .then(async () => {
                await randomDelay();

                coWebsites.remove(coWebsite);
                const mainCoWebsite = this.getMainCoWebsite();

                if (mainCoWebsite) {
                    this.removeHighlightCoWebsite(mainCoWebsite);
                    this.goToMain(mainCoWebsite);
                    this.resizeAllIframes();
                } else {
                    this.closeMain();
                }

                coWebsites.add(coWebsite, get(coWebsites).length);
            })
            .catch(() => {
                console.error();
            });
    }

    public closeCoWebsite(coWebsite: CoWebsite, withStack = true): void {
        if (get(coWebsites).length === 1) {
            this.fire();
        }

        this.removeCoWebsiteFromStack(coWebsite, withStack);

        const mainCoWebsite = this.getMainCoWebsite();

        if (mainCoWebsite) {
            this.removeHighlightCoWebsite(mainCoWebsite);
            this.goToMain(mainCoWebsite);
            this.resizeAllIframes();
        } else {
            this.closeMain();
        }
    }

    public closeCoWebsites(): void {
        get(coWebsites).forEach((coWebsite: CoWebsite) => {
            this.closeCoWebsite(coWebsite);
        });
    }

    public getGameSize(): { width: number; height: number } {
        if (this.getMainState() === iframeStates.closed) {
            return {
                width: window.innerWidth,
                height: window.innerHeight,
            };
        }
        if (!this.verticalMode) {
            return {
                width: window.innerWidth /*- this.width*/,
                height: window.innerHeight,
            };
        } else {
            return {
                width: window.innerWidth,
                height: window.innerHeight /*- this.height*/,
            };
        }
    }

    private fire(): void {
        this._onResize.next();
        waScaleManager.applyNewSize();
        // TODO: this line because the refresh focus should be emited with an event
        waScaleManager.refreshFocusOnTarget(gameManager.getCurrentGameScene().cameras.main);
    }

    private toggleFullScreenIcon(visible: boolean) {
        const openFullscreenImage = HtmlUtils.getElementByIdOrFail(cowebsiteOpenFullScreenImageId);
        const closeFullScreenImage = HtmlUtils.getElementByIdOrFail(cowebsiteCloseFullScreenImageId);

        if (visible) {
            openFullscreenImage.style.display = "inline";
            closeFullScreenImage.style.display = "none";
        } else {
            openFullscreenImage.style.display = "none";
            closeFullScreenImage.style.display = "inline";
        }
    }
}

export const coWebsiteManager = new CoWebsiteManager();
