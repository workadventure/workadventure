import { HtmlUtils } from "./HtmlUtils";
import { Subject } from "rxjs";
import { iframeListener } from "../Api/IframeListener";
import { waScaleManager } from "../Phaser/Services/WaScaleManager";
import { coWebsites, coWebsitesNotAsleep, mainCoWebsite } from "../Stores/CoWebsiteStore";
import { get, Writable, writable } from "svelte/store";
import { embedScreenLayout, highlightedEmbedScreen } from "../Stores/EmbedScreensStore";
import { isMediaBreakpointDown } from "../Utils/BreakpointsUtils";
import { jitsiFactory } from "./JitsiFactory";
import { gameManager } from "../Phaser/Game/GameManager";
import { LayoutMode } from "./LayoutManager";

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

export type CoWebsiteState = "asleep" | "loading" | "ready";

export type CoWebsite = {
    iframe: HTMLIFrameElement;
    url: URL;
    state: Writable<CoWebsiteState>;
    closable: boolean;
    allowPolicy: string | undefined;
    allowApi: boolean | undefined;
    widthPercent?: number | undefined;
    jitsi?: boolean;
    altMessage?: string;
};

class CoWebsiteManager {
    private openedMain: iframeStates = iframeStates.closed;

    private _onResize: Subject<void> = new Subject();
    public onResize = this._onResize.asObservable();
    /**
     * Quickly going in and out of an iframe trigger can create conflicts between the iframe states.
     * So we use this promise to queue up every cowebsite state transition
     */
    private currentOperationPromise: Promise<void> = Promise.resolve();
    private cowebsiteDom: HTMLDivElement;
    private resizing: boolean = false;
    private gameOverlayDom: HTMLDivElement;
    private cowebsiteBufferDom: HTMLDivElement;
    private cowebsiteAsideHolderDom: HTMLDivElement;
    private cowebsiteLoaderDom: HTMLDivElement;
    private previousTouchMoveCoordinates: TouchMoveCoordinates | null = null; //only use on touchscreens to track touch movement

    private loaderAnimationInterval: {
        interval: NodeJS.Timeout | undefined;
        trails: number[] | undefined;
    };

    private resizeObserver = new ResizeObserver((entries) => {
        this.resizeAllIframes();
    });

    public getMainState() {
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

        this.loaderAnimationInterval = {
            interval: undefined,
            trails: undefined,
        };

        this.holderListeners();
        this.transitionListeners();

        this.resizeObserver.observe(this.cowebsiteDom);
        this.resizeObserver.observe(this.gameOverlayDom);

        const buttonCloseCoWebsite = HtmlUtils.getElementByIdOrFail(cowebsiteCloseButtonId);
        buttonCloseCoWebsite.addEventListener("click", () => {
            const coWebsite = this.getMainCoWebsite();

            if (!coWebsite) {
                throw new Error("Undefined main co-website on closing");
            }

            if (coWebsite.closable) {
                this.closeCoWebsite(coWebsite).catch(() => {
                    console.error("Error during closing a co-website by a button");
                });
            } else {
                this.unloadCoWebsite(coWebsite).catch(() => {
                    console.error("Error during unloading a co-website by a button");
                });
            }
        });

        const buttonFullScreenFrame = HtmlUtils.getElementByIdOrFail(cowebsiteFullScreenButtonId);
        buttonFullScreenFrame.addEventListener("click", () => {
            buttonFullScreenFrame.blur();
            this.fullscreen();
        });

        const buttonSwipe = HtmlUtils.getElementByIdOrFail(cowebsiteSwipeButtonId);

        highlightedEmbedScreen.subscribe((value) => {
            if (!value || value.type !== "cowebsite") {
                buttonSwipe.style.display = "none";
                return;
            }

            buttonSwipe.style.display = "block";
        });

        buttonSwipe.addEventListener("click", () => {
            const highlightedEmbed = get(highlightedEmbedScreen);
            if (highlightedEmbed?.type === "cowebsite") {
                this.goToMain(highlightedEmbed.embed);
            }
        });
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
            if (event.type === "mousemove") {
                x = (event as MouseEvent).movementX / this.getDevicePixelRatio();
                y = (event as MouseEvent).movementY / this.getDevicePixelRatio();
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
            this.fire();
        };

        this.cowebsiteAsideHolderDom.addEventListener("mousedown", (event) => {
            if (this.isFullScreen) return;
            const coWebsite = this.getMainCoWebsite();

            if (!coWebsite) {
                this.closeMain();
                return;
            }

            coWebsite.iframe.style.display = "none";
            this.resizing = true;
            document.addEventListener("mousemove", movecallback);
        });

        document.addEventListener("mouseup", (event) => {
            if (!this.resizing || this.isFullScreen) return;
            document.removeEventListener("mousemove", movecallback);
            const coWebsite = this.getMainCoWebsite();

            if (!coWebsite) {
                this.resizing = false;
                this.closeMain();
                return;
            }

            coWebsite.iframe.style.display = "flex";
            this.resizing = false;
        });

        this.cowebsiteAsideHolderDom.addEventListener("touchstart", (event) => {
            if (this.isFullScreen) return;
            const coWebsite = this.getMainCoWebsite();

            if (!coWebsite) {
                this.closeMain();
                return;
            }

            coWebsite.iframe.style.display = "none";
            this.resizing = true;
            const touchEvent = event.touches[0];
            this.previousTouchMoveCoordinates = { x: touchEvent.pageX, y: touchEvent.pageY };
            document.addEventListener("touchmove", movecallback);
        });

        document.addEventListener("touchend", (event) => {
            if (!this.resizing || this.isFullScreen) return;
            this.previousTouchMoveCoordinates = null;
            document.removeEventListener("touchmove", movecallback);
            const coWebsite = this.getMainCoWebsite();

            if (!coWebsite) {
                this.closeMain();
                this.resizing = false;
                return;
            }

            coWebsite.iframe.style.display = "flex";
            this.resizing = false;
        });
    }

    private transitionListeners() {
        this.cowebsiteDom.addEventListener("transitionend", (event) => {
            if (this.cowebsiteDom.classList.contains("loading")) {
                this.fire();
            }

            if (this.cowebsiteDom.classList.contains("closing")) {
                this.cowebsiteDom.classList.remove("closing");
                if (this.loaderAnimationInterval.interval) {
                    clearInterval(this.loaderAnimationInterval.interval);
                }
                this.loaderAnimationInterval.trails = undefined;
            }
        });
    }

    public displayMain() {
        const coWebsite = this.getMainCoWebsite();
        if (coWebsite) {
            coWebsite.iframe.style.display = "block";
        }
        this.loadMain();
        this.openMain();
        this.fire();
    }

    public hideMain() {
        const coWebsite = this.getMainCoWebsite();
        if (coWebsite) {
            coWebsite.iframe.style.display = "none";
        }
        this.cowebsiteDom.classList.add("closing");
        this.cowebsiteDom.classList.remove("opened");
        this.openedMain = iframeStates.closed;
        this.fire();
    }

    private closeMain(): void {
        this.toggleFullScreenIcon(true);
        this.cowebsiteDom.classList.add("closing");
        this.cowebsiteDom.classList.remove("opened");
        this.openedMain = iframeStates.closed;
        this.resetStyleMain();
        this.fire();
    }

    private loadMain(openingWidth?: number): void {
        this.loaderAnimationInterval.interval = setInterval(() => {
            if (!this.loaderAnimationInterval.trails) {
                this.loaderAnimationInterval.trails = [0, 1, 2];
            }

            for (let trail = 1; trail < this.loaderAnimationInterval.trails.length + 1; trail++) {
                for (let state = 0; state < 4; state++) {
                    // const newState = this.loaderAnimationInterval.frames + trail -1;
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

        if (!this.verticalMode && openingWidth) {
            let newWidth = 50;

            if (openingWidth > 100) {
                newWidth = 100;
            } else if (openingWidth > 1) {
                newWidth = openingWidth;
            }

            newWidth = Math.round((newWidth * this.maxWidth) / 100);

            if (newWidth < this.cowebsiteAsideHolderDom.offsetWidth) {
                newWidth = this.cowebsiteAsideHolderDom.offsetWidth;
            }

            this.width = newWidth;
        }

        this.cowebsiteDom.classList.add("opened");
        this.openedMain = iframeStates.loading;
    }

    private openMain(): void {
        this.cowebsiteDom.addEventListener("transitionend", () => {
            this.resizeAllIframes();
        });
        this.openedMain = iframeStates.opened;
    }

    public resetStyleMain() {
        this.cowebsiteDom.style.width = "";
        this.cowebsiteDom.style.height = "";
    }

    public getCoWebsites(): CoWebsite[] {
        return get(coWebsites);
    }

    public getCoWebsiteById(coWebsiteId: string): CoWebsite | undefined {
        return get(coWebsites).find((coWebsite: CoWebsite) => coWebsite.iframe.id === coWebsiteId);
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
        return get(coWebsites).findIndex((currentCoWebsite) => currentCoWebsite.iframe.id === coWebsite.iframe.id);
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
            id += coWebsite.iframe.id;
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

        coWebsite.iframe.style.top = bounding.top + "px";
        coWebsite.iframe.style.left = bounding.left + "px";
        coWebsite.iframe.style.width = bounding.right - bounding.left + "px";
        coWebsite.iframe.style.height = bounding.bottom - bounding.top + "px";
    }

    public resizeAllIframes() {
        const mainCoWebsite = this.getCoWebsiteByPosition(0);
        const highlightEmbed = get(highlightedEmbedScreen);

        get(coWebsites).forEach((coWebsite) => {
            const notMain = !mainCoWebsite || (mainCoWebsite && mainCoWebsite.iframe.id !== coWebsite.iframe.id);
            const notHighlighEmbed =
                !highlightEmbed ||
                (highlightEmbed &&
                    (highlightEmbed.type !== "cowebsite" ||
                        (highlightEmbed.type === "cowebsite" &&
                            highlightEmbed.embed.iframe.id !== coWebsite.iframe.id)));

            if (coWebsite.iframe.classList.contains("main") && notMain) {
                coWebsite.iframe.classList.remove("main");
            }

            if (coWebsite.iframe.classList.contains("highlighted") && notHighlighEmbed) {
                coWebsite.iframe.classList.remove("highlighted");
                coWebsite.iframe.classList.add("pixel");
                coWebsite.iframe.style.top = "-1px";
                coWebsite.iframe.style.left = "-1px";
            }

            if (notMain && notHighlighEmbed) {
                coWebsite.iframe.classList.add("pixel");
                coWebsite.iframe.style.top = "-1px";
                coWebsite.iframe.style.left = "-1px";
            }

            this.setIframeOffset(coWebsite);
        });

        if (mainCoWebsite) {
            mainCoWebsite.iframe.classList.add("main");
            mainCoWebsite.iframe.classList.remove("pixel");
        }

        if (highlightEmbed && highlightEmbed.type === "cowebsite") {
            highlightEmbed.embed.iframe.classList.add("highlighted");
            highlightEmbed.embed.iframe.classList.remove("pixel");
        }
    }

    private removeHighlightCoWebsite(coWebsite: CoWebsite) {
        const highlighted = get(highlightedEmbedScreen);

        if (highlighted && highlighted.type === "cowebsite" && highlighted.embed.iframe.id === coWebsite.iframe.id) {
            highlightedEmbedScreen.removeHighlight();
        }
    }

    private removeCoWebsiteFromStack(coWebsite: CoWebsite) {
        this.removeHighlightCoWebsite(coWebsite);
        coWebsites.remove(coWebsite);

        if (get(coWebsites).length < 1) {
            this.closeMain();
        }

        coWebsite.iframe.remove();
    }

    public goToMain(coWebsite: CoWebsite) {
        const mainCoWebsite = this.getMainCoWebsite();
        coWebsites.remove(coWebsite);
        coWebsites.add(coWebsite, 0);

        if (
            isMediaBreakpointDown("lg") &&
            get(embedScreenLayout) === LayoutMode.Presentation &&
            mainCoWebsite &&
            mainCoWebsite.iframe.id !== coWebsite.iframe.id &&
            get(mainCoWebsite.state) !== "asleep"
        ) {
            highlightedEmbedScreen.toggleHighlight({
                type: "cowebsite",
                embed: mainCoWebsite,
            });
        }

        this.resizeAllIframes();
    }

    public searchJitsi(): CoWebsite | undefined {
        return get(coWebsites).find((coWebsite: CoWebsite) => coWebsite.jitsi);
    }

    private initialiseCowebsite(coWebsite: CoWebsite, position: number | undefined) {
        if (coWebsite.allowPolicy) {
            coWebsite.iframe.allow = coWebsite.allowPolicy;
        }

        if (coWebsite.allowApi) {
            iframeListener.registerIframe(coWebsite.iframe);
        }

        coWebsite.iframe.classList.add("pixel");

        const coWebsitePosition = position === undefined ? get(coWebsites).length : position;
        coWebsites.add(coWebsite, coWebsitePosition);
    }

    private generateUniqueId() {
        let id = undefined;
        do {
            id = "cowebsite-iframe-" + (Math.random() + 1).toString(36).substring(7);
        } while (this.getCoWebsiteById(id));

        return id;
    }

    public addCoWebsite(
        url: string,
        base: string,
        allowApi?: boolean,
        allowPolicy?: string,
        widthPercent?: number,
        position?: number,
        closable?: boolean,
        altMessage?: string
    ): CoWebsite {
        const iframe = document.createElement("iframe");
        const fullUrl = new URL(url, base);
        iframe.src = fullUrl.toString();
        iframe.id = this.generateUniqueId();

        const newCoWebsite: CoWebsite = {
            iframe,
            url: fullUrl,
            state: writable("asleep" as CoWebsiteState),
            closable: closable ?? false,
            allowPolicy,
            allowApi,
            widthPercent,
            altMessage,
        };

        this.initialiseCowebsite(newCoWebsite, position);

        return newCoWebsite;
    }

    public addCoWebsiteFromIframe(
        iframe: HTMLIFrameElement,
        allowApi?: boolean,
        allowPolicy?: string,
        widthPercent?: number,
        position?: number,
        closable?: boolean,
        jitsi?: boolean
    ): CoWebsite {
        if (get(coWebsitesNotAsleep).length < 1) {
            this.loadMain(widthPercent);
        }

        iframe.id = this.generateUniqueId();

        const newCoWebsite: CoWebsite = {
            iframe,
            url: new URL(iframe.src),
            state: writable("ready" as CoWebsiteState),
            closable: closable ?? false,
            allowPolicy,
            allowApi,
            widthPercent,
            jitsi,
        };

        if (position === 0) {
            this.openMain();
            setTimeout(() => {
                this.fire();
            }, animationTime);
        }

        this.initialiseCowebsite(newCoWebsite, position);

        return newCoWebsite;
    }

    public loadCoWebsite(coWebsite: CoWebsite): Promise<CoWebsite> {
        if (get(coWebsitesNotAsleep).length < 1) {
            coWebsites.remove(coWebsite);
            coWebsites.add(coWebsite, 0);
            this.loadMain(coWebsite.widthPercent);
        }

        // Check if the main is hide
        if (this.getMainCoWebsite() && this.openedMain === iframeStates.closed) {
            this.displayMain();
        }

        coWebsite.state.set("loading");

        const mainCoWebsite = this.getMainCoWebsite();

        return new Promise((resolve, reject) => {
            const onloadPromise = new Promise<void>((resolve) => {
                coWebsite.iframe.onload = () => {
                    coWebsite.state.set("ready");
                    resolve();
                };
            });

            const onTimeoutPromise = new Promise<void>((resolve) => {
                setTimeout(() => resolve(), 2000);
            });

            this.cowebsiteBufferDom.appendChild(coWebsite.iframe);

            if (coWebsite.jitsi) {
                const gameScene = gameManager.getCurrentGameScene();
                gameScene.disableMediaBehaviors();
                jitsiFactory.restart();
            }

            this.currentOperationPromise = this.currentOperationPromise
                .then(() => Promise.race([onloadPromise, onTimeoutPromise]))
                .then(() => {
                    if (mainCoWebsite && mainCoWebsite.iframe.id === coWebsite.iframe.id) {
                        this.openMain();

                        setTimeout(() => {
                            this.fire();
                        }, animationTime);
                    }

                    return resolve(coWebsite);
                })
                .catch((err) => {
                    console.error("Error on co-website loading => ", err);
                    this.removeCoWebsiteFromStack(coWebsite);
                    return reject();
                });
        });
    }

    public unloadCoWebsite(coWebsite: CoWebsite): Promise<void> {
        return new Promise((resolve, reject) => {
            this.removeHighlightCoWebsite(coWebsite);

            coWebsite.iframe.parentNode?.removeChild(coWebsite.iframe);
            coWebsite.state.set("asleep");
            coWebsites.remove(coWebsite);

            if (coWebsite.jitsi) {
                jitsiFactory.stop();
                const gameScene = gameManager.getCurrentGameScene();
                gameScene.enableMediaBehaviors();
            }

            const mainCoWebsite = this.getMainCoWebsite();

            if (mainCoWebsite) {
                this.removeHighlightCoWebsite(mainCoWebsite);
                this.goToMain(mainCoWebsite);
                this.resizeAllIframes();
            } else {
                this.closeMain();
            }

            coWebsites.add(coWebsite, get(coWebsites).length);

            resolve();
        });
    }

    public closeCoWebsite(coWebsite: CoWebsite): Promise<void> {
        this.currentOperationPromise = this.currentOperationPromise.then(
            () =>
                new Promise((resolve) => {
                    if (coWebsite.jitsi) {
                        jitsiFactory.destroy();
                        const gameScene = gameManager.getCurrentGameScene();
                        gameScene.enableMediaBehaviors();
                    }

                    if (get(coWebsites).length === 1) {
                        this.fire();
                    }

                    if (coWebsite.allowApi) {
                        iframeListener.unregisterIframe(coWebsite.iframe);
                    }

                    this.removeCoWebsiteFromStack(coWebsite);

                    const mainCoWebsite = this.getMainCoWebsite();

                    if (mainCoWebsite) {
                        this.removeHighlightCoWebsite(mainCoWebsite);
                        this.goToMain(mainCoWebsite);
                        this.resizeAllIframes();
                    } else {
                        this.closeMain();
                    }
                    resolve();
                })
        );
        return this.currentOperationPromise;
    }

    public closeCoWebsites(): Promise<void> {
        return (this.currentOperationPromise = this.currentOperationPromise.then(() => {
            get(coWebsites).forEach((coWebsite: CoWebsite) => {
                this.closeCoWebsite(coWebsite).catch(() => {
                    console.error("Error during closing a co-website");
                });
            });
        }));
        return this.currentOperationPromise;
    }

    public getGameSize(): { width: number; height: number } {
        if (this.openedMain === iframeStates.closed) {
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

    private fullscreen(): void {
        if (this.isFullScreen) {
            this.toggleFullScreenIcon(true);
            this.resetStyleMain();
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
