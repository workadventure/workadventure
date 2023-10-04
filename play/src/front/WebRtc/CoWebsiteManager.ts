import { Subject } from "rxjs";
import type { Readable, Unsubscriber, Writable } from "svelte/store";
import { get, writable } from "svelte/store";
import type CancelablePromise from "cancelable-promise";
import { randomDelay } from "@workadventure/shared-utils/src/RandomDelay/RandomDelay";
import { waScaleManager } from "../Phaser/Services/WaScaleManager";
import { coWebsites, coWebsitesNotAsleep, mainCoWebsite } from "../Stores/CoWebsiteStore";
import { embedScreenLayoutStore } from "../Stores/EmbedScreensStore";
import { highlightedEmbedScreen } from "../Stores/HighlightedEmbedScreenStore";
import { isMediaBreakpointDown } from "../Utils/BreakpointsUtils";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { gameManager } from "../Phaser/Game/GameManager";
import { inCowebsiteZone } from "../Stores/MediaStore";
import { LayoutMode } from "./LayoutManager";
import type { CoWebsite } from "./CoWebsite/CoWebsite";
import { HtmlUtils } from "./HtmlUtils";

export enum iframeStates {
    closed = 1,
    loading, // loading an iframe can be slow, so we show some placeholder until it is ready
    opened,
}

const cowebsiteDomId = "cowebsite"; // the id of the whole container.
const gameOverlayDomId = "game-overlay";
const cowebsiteBufferDomId = "cowebsite-buffer"; // the id of the container who contains cowebsite iframes.
const cowebsiteAsideHolderDomId = "cowebsite-aside-holder";
const cowebsiteLoaderDomId = "cowebsite-loader";
const cowebsiteCloseButtonId = "cowebsite-close";
const cowebsiteFullScreenButtonId = "cowebsite-fullscreen";
const cowebsiteOpenFullScreenImageId = "cowebsite-fullscreen-open";
const cowebsiteCloseFullScreenImageId = "cowebsite-fullscreen-close";
const cowebsiteSwipeButtonId = "cowebsite-swipe";
const cowebsiteSlotBaseDomId = "cowebsite-slot-";
const animationTime = 500; //time used by the css transitions, in ms.

interface TouchMoveCoordinates {
    x: number;
    y: number;
}

class CoWebsiteManager {
    private openedMain: Writable<iframeStates> = writable(iframeStates.closed);

    private _onResize: Subject<void> = new Subject();
    public onResize = this._onResize.asObservable();

    private cowebsiteDom: HTMLDivElement;
    private resizing = false;
    private gameOverlayDom: HTMLDivElement;
    private cowebsiteBufferDom: HTMLDivElement;
    private cowebsiteAsideHolderDom: HTMLDivElement;
    private cowebsiteLoaderDom: HTMLDivElement;
    private previousTouchMoveCoordinates: TouchMoveCoordinates | null = null; //only use on touchscreens to track touch movement
    private coWebsiteResizeSize = 50;

    private buttonCloseCoWebsite: HTMLElement;

    private loaderAnimationInterval: {
        interval: NodeJS.Timeout | undefined;
        trails: number[] | undefined;
    };

    private resizeObserver = new ResizeObserver(() => {
        this.resizeAllIframes();

        if (!this.isFullScreen && this.cowebsiteAsideHolderDom.style.visibility === "hidden") {
            this.toggleFullScreenIcon(true);
            this.restoreMainSize();
            this.fire();
        }
    });

    private mainCoWebsiteUnsubscriber: Unsubscriber;
    private highlightedEmbedScreenUnsubscriber: Unsubscriber;

    public getMainState() {
        return get(this.openedMain);
    }

    public getMainStateSubscriber(): Readable<iframeStates> {
        return this.openedMain;
    }

    get width(): number {
        return this.cowebsiteDom.clientWidth;
    }

    set width(width: number) {
        this.cowebsiteDom.style.width = width + "px";
    }

    get maxWidth(): number {
        let maxWidth = 75 * window.innerWidth;
        if (maxWidth !== 0) {
            maxWidth = Math.round(maxWidth / 100);
        }

        return maxWidth;
    }

    get height(): number {
        return this.cowebsiteDom.clientHeight;
    }

    set height(height: number) {
        this.cowebsiteDom.style.height = height + "px";
    }

    get maxHeight(): number {
        let maxHeight = 60 * window.innerHeight;
        if (maxHeight !== 0) {
            maxHeight = Math.round(maxHeight / 100);
        }

        return maxHeight;
    }

    get verticalMode(): boolean {
        return window.innerWidth < window.innerHeight;
    }

    get isFullScreen(): boolean {
        return this.verticalMode ? this.height === window.innerHeight : this.width === window.innerWidth;
    }

    constructor() {
        this.cowebsiteDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteDomId);
        this.gameOverlayDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(gameOverlayDomId);
        this.cowebsiteBufferDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteBufferDomId);
        this.cowebsiteAsideHolderDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteAsideHolderDomId);
        this.cowebsiteLoaderDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteLoaderDomId);

        this.buttonCloseCoWebsite = HtmlUtils.getElementByIdOrFail(cowebsiteCloseButtonId);

        this.loaderAnimationInterval = {
            interval: undefined,
            trails: undefined,
        };

        this.mainCoWebsiteUnsubscriber = mainCoWebsite.subscribe((coWebsite) => {
            this.buttonCloseCoWebsite.hidden = !coWebsite?.isClosable() ?? false;
        });

        this.holderListeners();
        this.transitionListeners();

        this.resizeObserver.observe(this.cowebsiteDom);
        this.resizeObserver.observe(this.gameOverlayDom);

        this.buttonCloseCoWebsite.addEventListener("click", () => {
            analyticsClient.closeMultiIframe();
            const coWebsite = this.getMainCoWebsite();

            if (!coWebsite) {
                throw new Error("Undefined main co-website on closing");
            }

            if (coWebsite.isClosable()) {
                //if user is in a Jitsi or openWebsite zone, the stack won't be closable
                this.closeCoWebsite(coWebsite, !get(inCowebsiteZone));
            } else {
                this.unloadCoWebsite(coWebsite).catch((err) => {
                    console.error("Cannot unload co-website on click on close button", err);
                });
            }
        });

        const buttonFullScreenFrame = HtmlUtils.getElementByIdOrFail(cowebsiteFullScreenButtonId);
        buttonFullScreenFrame.addEventListener("click", () => {
            analyticsClient.fullScreenMultiIframe();
            buttonFullScreenFrame.blur();
            this.toggleFullscreen();
        });

        const buttonSwipe = HtmlUtils.getElementByIdOrFail(cowebsiteSwipeButtonId);

        this.highlightedEmbedScreenUnsubscriber = highlightedEmbedScreen.subscribe((value) => {
            if (!value || value.type !== "cowebsite") {
                buttonSwipe.style.display = "none";
                return;
            }

            buttonSwipe.style.display = "block";
        });

        buttonSwipe.addEventListener("click", () => {
            analyticsClient.switchMultiIframe();
            const mainCoWebsite = this.getMainCoWebsite();
            const highlightedEmbed = get(highlightedEmbedScreen);
            if (highlightedEmbed?.type === "cowebsite") {
                this.goToMain(highlightedEmbed.embed);

                if (mainCoWebsite) {
                    highlightedEmbedScreen.toggleHighlight({
                        type: "cowebsite",
                        embed: mainCoWebsite,
                    });
                }
            }
        });
    }

    public cleanup(): void {
        this.closeCoWebsites();
        this.mainCoWebsiteUnsubscriber();
        this.highlightedEmbedScreenUnsubscriber();
    }

    public getCoWebsiteBuffer(): HTMLDivElement {
        return this.cowebsiteBufferDom;
    }

    public getDevicePixelRatio(): number {
        //on chrome engines, movementX and movementY return global screens coordinates while other browser return pixels
        //so on chrome-based browser we need to adjust using 'devicePixelRatio'
        return window.navigator.userAgent.includes("Firefox") ? 1 : window.devicePixelRatio;
    }

    private holderListeners() {
        const movecallback = (event: MouseEvent | TouchEvent) => {
            let x, y;
            if (event.type === "mousemove" && event instanceof MouseEvent) {
                x = event.movementX / this.getDevicePixelRatio();
                y = event.movementY / this.getDevicePixelRatio();
            } else {
                const touchEvent = (event as TouchEvent).touches[0];
                const last = { x: touchEvent.pageX, y: touchEvent.pageY };
                const previous = this.previousTouchMoveCoordinates as TouchMoveCoordinates;
                this.previousTouchMoveCoordinates = last;
                x = last.x - previous.x;
                y = last.y - previous.y;
            }

            if (this.verticalMode) {
                const tempValue = this.height + y;

                if (tempValue < this.cowebsiteAsideHolderDom.offsetHeight) {
                    this.height = this.cowebsiteAsideHolderDom.offsetHeight;
                } else if (tempValue > this.maxHeight) {
                    this.height = this.maxHeight;
                } else {
                    this.height = tempValue;
                }
            } else {
                const tempValue = this.width - x;

                if (tempValue < this.cowebsiteAsideHolderDom.offsetWidth) {
                    this.width = this.cowebsiteAsideHolderDom.offsetWidth;
                } else if (tempValue > this.maxWidth) {
                    this.width = this.maxWidth;
                } else {
                    this.width = tempValue;
                }
            }

            this.saveMainSize();
            this.fire();
        };

        this.cowebsiteAsideHolderDom.addEventListener("mousedown", () => {
            if (this.isFullScreen) return;
            const coWebsite = this.getMainCoWebsite();

            if (!coWebsite) {
                this.closeMain();
                return;
            }

            const iframe = coWebsite.getIframe();
            if (iframe) {
                this.activateMainLoaderAnimation();
                iframe.style.display = "none";
            }
            this.resizing = true;
            document.addEventListener("mousemove", movecallback);
        });

        document.addEventListener("mouseup", () => {
            if (!this.resizing || this.isFullScreen) return;
            document.removeEventListener("mousemove", movecallback);
            const coWebsite = this.getMainCoWebsite();

            if (!coWebsite) {
                this.resizing = false;
                this.closeMain();
                return;
            }

            const iframe = coWebsite.getIframe();
            if (iframe) {
                iframe.style.display = "flex";
                this.desactivateMainLoaderAnimation();
            }
            this.resizing = false;
        });

        this.cowebsiteAsideHolderDom.addEventListener("touchstart", (event) => {
            if (this.isFullScreen) return;
            const coWebsite = this.getMainCoWebsite();

            if (!coWebsite) {
                this.closeMain();
                return;
            }

            const iframe = coWebsite.getIframe();
            if (iframe) {
                this.activateMainLoaderAnimation();
                iframe.style.display = "none";
            }
            this.resizing = true;
            const touchEvent = event.touches[0];
            this.previousTouchMoveCoordinates = { x: touchEvent.pageX, y: touchEvent.pageY };
            document.addEventListener("touchmove", movecallback);
        });

        document.addEventListener("touchend", () => {
            if (!this.resizing || this.isFullScreen) return;
            this.previousTouchMoveCoordinates = null;
            document.removeEventListener("touchmove", movecallback);
            const coWebsite = this.getMainCoWebsite();

            if (!coWebsite) {
                this.closeMain();
                this.resizing = false;
                return;
            }

            const iframe = coWebsite.getIframe();
            if (iframe) {
                iframe.style.display = "flex";
                this.desactivateMainLoaderAnimation();
            }
            this.resizing = false;
        });
    }

    private transitionListeners() {
        this.cowebsiteDom.addEventListener("transitionend", () => {
            if (this.cowebsiteDom.classList.contains("loading")) {
                this.fire();
            }

            if (this.cowebsiteDom.classList.contains("closing")) {
                this.cowebsiteDom.classList.remove("closing");
                this.desactivateMainLoaderAnimation();
                this.loaderAnimationInterval.trails = undefined;
            }
        });
    }

    public displayMain() {
        const coWebsite = this.getMainCoWebsite();
        if (coWebsite) {
            const iframe = coWebsite.getIframe();
            if (iframe) {
                iframe.style.display = "block";
            }
        }
        this.loadMain(coWebsite?.getWidthPercent());
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
        this.cowebsiteDom.classList.add("closing");
        this.cowebsiteDom.classList.remove("opened");
        this.openedMain.set(iframeStates.closed);
        this.fire();
    }

    private closeMain(): void {
        this.toggleFullScreenIcon(true);
        this.cowebsiteDom.classList.add("closing");
        this.cowebsiteDom.classList.remove("opened");
        this.openedMain.set(iframeStates.closed);
        this.cowebsiteDom.style.height = "";
        this.cowebsiteDom.style.width = "";
        this.coWebsiteResizeSize = 50;
        this.fire();
    }

    private activateMainLoaderAnimation() {
        this.desactivateMainLoaderAnimation();
        const customLogo = gameManager.currentStartedRoom.loadingCowebsiteLogo;

        if (customLogo) {
            const logo = document.createElement("img");
            logo.id = "custom-logo";
            logo.src = customLogo;
            this.cowebsiteLoaderDom.parentNode?.replaceChild(logo, this.cowebsiteLoaderDom);
            this.cowebsiteLoaderDom.style.display = "block";
            return;
        }

        this.cowebsiteLoaderDom.style.display = "block";
        this.loaderAnimationInterval.interval = setInterval(() => {
            if (!this.loaderAnimationInterval.trails) {
                this.loaderAnimationInterval.trails = [0, 1, 2];
            }

            for (let trail = 1; trail < this.loaderAnimationInterval.trails.length + 1; trail++) {
                for (let state = 0; state < 4; state++) {
                    const stateDom = this.cowebsiteLoaderDom.querySelector(
                        `#trail-${trail}-state-${state}`
                    ) as SVGPolygonElement;

                    if (!stateDom) {
                        continue;
                    }

                    stateDom.style.visibility =
                        this.loaderAnimationInterval.trails[trail - 1] !== 0 &&
                        this.loaderAnimationInterval.trails[trail - 1] >= state
                            ? "visible"
                            : "hidden";
                }
            }

            this.loaderAnimationInterval.trails = this.loaderAnimationInterval.trails.map((trail) =>
                trail === 3 ? 0 : trail + 1
            );
        }, 200);
    }

    private desactivateMainLoaderAnimation() {
        if (this.loaderAnimationInterval.interval) {
            this.cowebsiteLoaderDom.style.display = "none";
            clearInterval(this.loaderAnimationInterval.interval);
        }
    }

    private saveMainSize() {
        this.coWebsiteResizeSize = this.verticalMode
            ? Math.round((this.height * 100) / window.innerHeight)
            : Math.round((this.width * 100) / window.innerWidth);
    }

    public restoreMainSize() {
        this.verticalMode ? (this.cowebsiteDom.style.width = "") : (this.cowebsiteDom.style.height = "");
        this.verticalMode
            ? (this.height = Math.round((this.coWebsiteResizeSize * window.innerHeight) / 100))
            : (this.width = Math.round((this.coWebsiteResizeSize * window.innerWidth) / 100));
    }

    private loadMain(openingWidth?: number): void {
        this.activateMainLoaderAnimation();

        let newWidth = openingWidth ?? 50;

        if (newWidth > 75 && !this.isFullScreen) {
            this.coWebsiteResizeSize = 75;
            this.toggleFullscreen();
        } else if (this.verticalMode) {
            const holderPercent = Math.round((this.cowebsiteAsideHolderDom.offsetHeight * 100) / window.innerHeight);

            if (newWidth < holderPercent) {
                newWidth = holderPercent;
            } else if (newWidth > this.maxWidth) {
                newWidth = 100;
            }

            this.cowebsiteDom.style.width = "";
            this.height = Math.round((newWidth * window.innerHeight) / 100);
            this.saveMainSize();
        } else {
            const holderPercent = Math.round((this.cowebsiteAsideHolderDom.offsetWidth * 100) / window.innerWidth);

            if (newWidth < holderPercent) {
                newWidth = holderPercent;
            } else if (newWidth > this.maxWidth) {
                newWidth = 100;
            }

            this.cowebsiteDom.style.height = "";
            this.width = Math.round((newWidth * window.innerWidth) / 100);
            this.saveMainSize();
        }

        this.cowebsiteDom.classList.add("opened");
        this.openedMain.set(iframeStates.loading);
    }

    private openMain(): void {
        this.cowebsiteDom.addEventListener("transitionend", () => {
            this.resizeAllIframes();
        });
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
            this.loadMain(coWebsite.getWidthPercent());
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
                width: window.innerWidth - this.width,
                height: window.innerHeight,
            };
        } else {
            return {
                width: window.innerWidth,
                height: window.innerHeight - this.height,
            };
        }
    }

    private fire(): void {
        this._onResize.next();
        waScaleManager.applyNewSize();
        waScaleManager.refreshFocusOnTarget();
    }

    private toggleFullscreen(): void {
        if (this.isFullScreen) {
            this.toggleFullScreenIcon(true);
            this.restoreMainSize();
            this.fire();
            //we don't trigger a resize of the phaser game since it won't be visible anyway.
        } else {
            this.toggleFullScreenIcon(false);
            this.verticalMode ? (this.height = window.innerHeight) : (this.width = window.innerWidth);
            //we don't trigger a resize of the phaser game since it won't be visible anyway.
        }
    }

    private toggleFullScreenIcon(visible: boolean) {
        const openFullscreenImage = HtmlUtils.getElementByIdOrFail(cowebsiteOpenFullScreenImageId);
        const closeFullScreenImage = HtmlUtils.getElementByIdOrFail(cowebsiteCloseFullScreenImageId);

        if (visible) {
            this.cowebsiteAsideHolderDom.style.visibility = "visible";
            openFullscreenImage.style.display = "inline";
            closeFullScreenImage.style.display = "none";
        } else {
            this.cowebsiteAsideHolderDom.style.visibility = "hidden";
            openFullscreenImage.style.display = "none";
            closeFullScreenImage.style.display = "inline";
        }
    }
}

export const coWebsiteManager = new CoWebsiteManager();
