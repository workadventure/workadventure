import { HtmlUtils } from "./HtmlUtils";
import { Subject } from "rxjs";
import { iframeListener } from "../Api/IframeListener";
import { waScaleManager } from "../Phaser/Services/WaScaleManager";
import { ICON_URL } from "../Enum/EnvironmentVariable";

enum iframeStates {
    closed = 1,
    loading, // loading an iframe can be slow, so we show some placeholder until it is ready
    opened,
}

const cowebsiteDomId = "cowebsite"; // the id of the whole container.
const cowebsiteContainerDomId = "cowebsite-container"; // the id of the whole container.
const cowebsiteMainDomId = "cowebsite-slot-0"; // the id of the parent div of the iframe.
const cowebsiteBufferDomId = "cowebsite-buffer"; // the id of the container who contains cowebsite iframes.
const cowebsiteAsideDomId = "cowebsite-aside"; // the id of the parent div of the iframe.
const cowebsiteAsideHolderDomId = "cowebsite-aside-holder";
const cowebsiteSubIconsDomId = "cowebsite-sub-icons";
export const cowebsiteCloseButtonId = "cowebsite-close";
const cowebsiteFullScreenButtonId = "cowebsite-fullscreen";
const cowebsiteOpenFullScreenImageId = "cowebsite-fullscreen-open";
const cowebsiteCloseFullScreenImageId = "cowebsite-fullscreen-close";
const animationTime = 500; //time used by the css transitions, in ms.

interface TouchMoveCoordinates {
    x: number;
    y: number;
}

export type CoWebsite = {
    iframe: HTMLIFrameElement;
    icon: HTMLDivElement;
    position: number;
};

type CoWebsiteSlot = {
    container: HTMLElement;
    position: number;
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
    private cowebsiteContainerDom: HTMLDivElement;
    private resizing: boolean = false;
    private cowebsiteMainDom: HTMLDivElement;
    private cowebsiteBufferDom: HTMLDivElement;
    private cowebsiteAsideDom: HTMLDivElement;
    private cowebsiteAsideHolderDom: HTMLDivElement;
    private cowebsiteSubIconsDom: HTMLDivElement;
    private previousTouchMoveCoordinates: TouchMoveCoordinates | null = null; //only use on touchscreens to track touch movement

    private coWebsites: CoWebsite[] = [];

    private slots: CoWebsiteSlot[];

    private resizeObserver = new ResizeObserver((entries) => {
        this.resizeAllIframes();
    });

    get width(): number {
        return this.cowebsiteDom.clientWidth;
    }

    set width(width: number) {
        this.cowebsiteDom.style.width = width + "px";
    }

    set widthPercent(width: number) {
        this.cowebsiteDom.style.width = width + "%";
    }

    get height(): number {
        return this.cowebsiteDom.clientHeight;
    }

    set height(height: number) {
        this.cowebsiteDom.style.height = height + "px";
    }

    get verticalMode(): boolean {
        return window.innerWidth < window.innerHeight;
    }

    get isFullScreen(): boolean {
        return this.verticalMode ? this.height === window.innerHeight : this.width === window.innerWidth;
    }

    constructor() {
        this.cowebsiteDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteDomId);
        this.cowebsiteContainerDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteContainerDomId);
        this.cowebsiteMainDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteMainDomId);
        this.cowebsiteBufferDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteBufferDomId);
        this.cowebsiteAsideDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteAsideDomId);
        this.cowebsiteAsideHolderDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteAsideHolderDomId);
        this.cowebsiteSubIconsDom = HtmlUtils.getElementByIdOrFail<HTMLDivElement>(cowebsiteSubIconsDomId);
        this.initResizeListeners();

        this.resizeObserver.observe(this.cowebsiteDom);
        this.resizeObserver.observe(this.cowebsiteContainerDom);

        this.slots = [
            {
                container: this.cowebsiteMainDom,
                position: 0,
            },
            {
                container: HtmlUtils.getElementByIdOrFail<HTMLDivElement>("cowebsite-slot-1"),
                position: 1,
            },
            {
                container: HtmlUtils.getElementByIdOrFail<HTMLDivElement>("cowebsite-slot-2"),
                position: 2,
            },
            {
                container: HtmlUtils.getElementByIdOrFail<HTMLDivElement>("cowebsite-slot-3"),
                position: 3,
            },
            {
                container: HtmlUtils.getElementByIdOrFail<HTMLDivElement>("cowebsite-slot-4"),
                position: 4,
            },
        ];

        this.slots.forEach((slot) => {
            this.resizeObserver.observe(slot.container);
        });

        this.initActionsListeners();

        const buttonCloseCoWebsites = HtmlUtils.getElementByIdOrFail(cowebsiteCloseButtonId);
        buttonCloseCoWebsites.addEventListener("click", () => {
            if (this.isSmallScreen() && this.coWebsites.length > 1) {
                const coWebsite = this.getCoWebsiteByPosition(0);

                if (coWebsite) {
                    this.removeCoWebsiteFromStack(coWebsite);
                    return;
                }
            }

            buttonCloseCoWebsites.blur();
            this.closeCoWebsites().catch((e) => console.error(e));
        });

        const buttonFullScreenFrame = HtmlUtils.getElementByIdOrFail(cowebsiteFullScreenButtonId);
        buttonFullScreenFrame.addEventListener("click", () => {
            buttonFullScreenFrame.blur();
            this.fullscreen();
        });
    }

    public getDevicePixelRatio(): number {
        //on chrome engines, movementX and movementY return global screens coordinates while other browser return pixels
        //so on chrome-based browser we need to adjust using 'devicePixelRatio'
        return window.navigator.userAgent.includes("Firefox") ? 1 : window.devicePixelRatio;
    }

    private isSmallScreen(): boolean {
        return (
            window.matchMedia("(max-aspect-ratio: 1/1)").matches ||
            window.matchMedia("(max-width:960px) and (max-height:768px)").matches
        );
    }

    private initResizeListeners() {
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

            this.verticalMode ? (this.height += y) : (this.width -= x);
            this.fire();
        };

        this.cowebsiteAsideHolderDom.addEventListener("mousedown", (event) => {
            if (this.isFullScreen) return;
            this.cowebsiteMainDom.style.display = "none";
            this.resizing = true;
            document.addEventListener("mousemove", movecallback);
        });

        document.addEventListener("mouseup", (event) => {
            if (!this.resizing || this.isFullScreen) return;
            document.removeEventListener("mousemove", movecallback);
            this.cowebsiteMainDom.style.display = "block";
            this.resizing = false;
            this.cowebsiteMainDom.style.display = "flex";
        });

        this.cowebsiteAsideHolderDom.addEventListener("touchstart", (event) => {
            if (this.isFullScreen) return;
            this.cowebsiteMainDom.style.display = "none";
            this.resizing = true;
            const touchEvent = event.touches[0];
            this.previousTouchMoveCoordinates = { x: touchEvent.pageX, y: touchEvent.pageY };
            document.addEventListener("touchmove", movecallback);
        });

        document.addEventListener("touchend", (event) => {
            if (!this.resizing || this.isFullScreen) return;
            this.previousTouchMoveCoordinates = null;
            document.removeEventListener("touchmove", movecallback);
            this.cowebsiteMainDom.style.display = "block";
            this.resizing = false;
            this.cowebsiteMainDom.style.display = "flex";
        });
    }

    private closeMain(): void {
        this.cowebsiteDom.classList.remove("loaded"); //edit the css class to trigger the transition
        this.cowebsiteDom.classList.add("hidden");
        this.openedMain = iframeStates.closed;
        this.resetStyleMain();
        this.cowebsiteDom.style.display = "none";
    }
    private loadMain(): void {
        this.cowebsiteDom.style.display = "flex";
        this.cowebsiteDom.classList.remove("hidden"); //edit the css class to trigger the transition
        this.cowebsiteDom.classList.add("loading");
        this.openedMain = iframeStates.loading;
    }
    private openMain(): void {
        this.cowebsiteDom.addEventListener("transitionend", () => {
            this.resizeAllIframes();
        });
        this.cowebsiteDom.classList.remove("loading", "hidden"); //edit the css class to trigger the transition
        this.openedMain = iframeStates.opened;
        this.resetStyleMain();
    }

    public resetStyleMain() {
        this.cowebsiteDom.style.width = "";
        this.cowebsiteDom.style.height = "";
    }

    private initActionsListeners() {
        this.slots.forEach((slot: CoWebsiteSlot) => {
            const expandButton = slot.container.querySelector(".expand");
            const highlightButton = slot.container.querySelector(".hightlight");
            const closeButton = slot.container.querySelector(".close");

            if (expandButton) {
                expandButton.addEventListener("click", (event) => {
                    event.preventDefault();
                    const coWebsite = this.getCoWebsiteByPosition(slot.position);

                    if (!coWebsite) {
                        return;
                    }

                    this.moveRightPreviousCoWebsite(coWebsite, 0);
                });
            }

            if (highlightButton) {
                highlightButton.addEventListener("click", (event) => {
                    event.preventDefault();
                    const coWebsite = this.getCoWebsiteByPosition(slot.position);

                    if (!coWebsite) {
                        return;
                    }

                    this.moveRightPreviousCoWebsite(coWebsite, 1);
                });
            }

            if (closeButton) {
                closeButton.addEventListener("click", (event) => {
                    event.preventDefault();
                    const coWebsite = this.getCoWebsiteByPosition(slot.position);

                    if (!coWebsite) {
                        return;
                    }

                    this.removeCoWebsiteFromStack(coWebsite);
                });
            }
        });
    }

    public getCoWebsites(): CoWebsite[] {
        return this.coWebsites;
    }

    public getCoWebsiteById(coWebsiteId: string): CoWebsite | undefined {
        return this.coWebsites.find((coWebsite: CoWebsite) => coWebsite.iframe.id === coWebsiteId);
    }

    private getSlotByPosition(position: number): CoWebsiteSlot | undefined {
        return this.slots.find((slot: CoWebsiteSlot) => slot.position === position);
    }

    private getCoWebsiteByPosition(position: number): CoWebsite | undefined {
        return this.coWebsites.find((coWebsite: CoWebsite) => coWebsite.position === position);
    }

    private setIframeOffset(coWebsite: CoWebsite, slot: CoWebsiteSlot) {
        const bounding = slot.container.getBoundingClientRect();

        if (coWebsite.iframe.classList.contains("thumbnail")) {
            coWebsite.iframe.style.width = (bounding.right - bounding.left) * 2 + "px";
            coWebsite.iframe.style.height = (bounding.bottom - bounding.top) * 2 + "px";
            coWebsite.iframe.style.top = bounding.top - Math.floor(bounding.height * 0.5) + "px";
            coWebsite.iframe.style.left = bounding.left - Math.floor(bounding.width * 0.5) + "px";
        } else {
            coWebsite.iframe.style.top = bounding.top + "px";
            coWebsite.iframe.style.left = bounding.left + "px";
            coWebsite.iframe.style.width = bounding.right - bounding.left + "px";
            coWebsite.iframe.style.height = bounding.bottom - bounding.top + "px";
        }
    }

    private resizeAllIframes() {
        this.coWebsites.forEach((coWebsite: CoWebsite) => {
            const slot = this.getSlotByPosition(coWebsite.position);

            if (slot) {
                this.setIframeOffset(coWebsite, slot);
            }
        });
    }

    private moveCoWebsite(coWebsite: CoWebsite, newPosition: number) {
        const oldSlot = this.getSlotByPosition(coWebsite.position);
        const newSlot = this.getSlotByPosition(newPosition);

        if (!newSlot) {
            return;
        }

        coWebsite.iframe.scrolling = newPosition === 0 || newPosition === 1 ? "yes" : "no";

        if (newPosition === 0) {
            coWebsite.iframe.classList.add("main");
            coWebsite.icon.style.display = "none";
        } else {
            coWebsite.iframe.classList.remove("main");
            coWebsite.icon.style.display = "flex";
        }

        if (newPosition === 1) {
            coWebsite.iframe.classList.add("sub-main");
        } else {
            coWebsite.iframe.classList.remove("sub-main");
        }

        if (newPosition >= 2) {
            coWebsite.iframe.classList.add("thumbnail");
        } else {
            coWebsite.iframe.classList.remove("thumbnail");
        }

        coWebsite.position = newPosition;

        if (oldSlot && !this.getCoWebsiteByPosition(oldSlot.position)) {
            oldSlot.container.style.display = "none";
        }

        this.displayCowebsiteContainer();

        newSlot.container.style.display = "block";

        coWebsite.iframe.classList.remove("pixel");

        this.resizeAllIframes();
    }

    private displayCowebsiteContainer() {
        if (this.coWebsites.find((cowebsite) => cowebsite.position > 0)) {
            this.cowebsiteContainerDom.style.display = "block";
        } else {
            this.cowebsiteContainerDom.style.display = "none";
        }
    }

    private moveLeftPreviousCoWebsite(coWebsite: CoWebsite, newPosition: number) {
        const nextCoWebsite = this.getCoWebsiteByPosition(coWebsite.position + 1);

        this.moveCoWebsite(coWebsite, newPosition);

        if (nextCoWebsite) {
            this.moveLeftPreviousCoWebsite(nextCoWebsite, nextCoWebsite.position - 1);
        }
    }

    private moveRightPreviousCoWebsite(coWebsite: CoWebsite, newPosition: number) {
        if (newPosition >= 5) {
            return;
        }

        const currentCoWebsite = this.getCoWebsiteByPosition(newPosition);

        this.moveCoWebsite(coWebsite, newPosition);

        if (newPosition === 4 || !currentCoWebsite || currentCoWebsite.iframe.id === coWebsite.iframe.id) {
            return;
        }

        if (!currentCoWebsite) {
            return;
        }

        this.moveRightPreviousCoWebsite(currentCoWebsite, currentCoWebsite.position + 1);
    }

    private removeCoWebsiteFromStack(coWebsite: CoWebsite) {
        this.coWebsites = this.coWebsites.filter(
            (coWebsiteToRemove: CoWebsite) => coWebsiteToRemove.iframe.id !== coWebsite.iframe.id
        );

        if (this.coWebsites.length < 1) {
            this.closeMain();
        }

        if (coWebsite.position > 0) {
            const slot = this.getSlotByPosition(coWebsite.position);
            if (slot) {
                slot.container.style.display = "none";
            }
        }

        const previousCoWebsite = this.coWebsites.find(
            (coWebsiteToCheck: CoWebsite) => coWebsite.position + 1 === coWebsiteToCheck.position
        );

        if (previousCoWebsite) {
            this.moveLeftPreviousCoWebsite(previousCoWebsite, coWebsite.position);
        }

        this.displayCowebsiteContainer();

        coWebsite.icon.remove();
        coWebsite.iframe.remove();
    }

    public searchJitsi(): CoWebsite | undefined {
        return this.coWebsites.find((coWebsite: CoWebsite) => coWebsite.iframe.id.toLowerCase().includes("jitsi"));
    }

    private generateCoWebsiteIcon(iframe: HTMLIFrameElement): HTMLDivElement {
        const icon = document.createElement("div");
        icon.id = "cowebsite-icon-" + iframe.id;
        icon.style.display = "none";

        const iconImage = document.createElement("img");
        iconImage.src = `${ICON_URL}/icon?url=${iframe.src}&size=16..30..256`;
        const url = new URL(iframe.src);
        iconImage.alt = url.hostname;

        icon.appendChild(iconImage);

        return icon;
    }

    public loadCoWebsite(
        url: string,
        base: string,
        allowApi?: boolean,
        allowPolicy?: string,
        widthPercent?: number,
        position?: number
    ): Promise<CoWebsite> {
        return this.addCoWebsite(
            (iframeBuffer) => {
                const iframe = document.createElement("iframe");
                iframe.src = new URL(url, base).toString();

                if (allowPolicy) {
                    iframe.allow = allowPolicy;
                }

                if (allowApi) {
                    iframeListener.registerIframe(iframe);
                }

                iframeBuffer.appendChild(iframe);

                return iframe;
            },
            widthPercent,
            position
        );
    }

    public async addCoWebsite(
        callback: (iframeBuffer: HTMLDivElement) => PromiseLike<HTMLIFrameElement> | HTMLIFrameElement,
        widthPercent?: number,
        position?: number
    ): Promise<CoWebsite> {
        return new Promise((resolve, reject) => {
            if (this.coWebsites.length < 1) {
                this.loadMain();
            } else if (this.coWebsites.length === 5) {
                throw new Error("Too many websites");
            }

            Promise.resolve(callback(this.cowebsiteBufferDom))
                .then((iframe) => {
                    iframe?.classList.add("pixel");

                    if (!iframe.id) {
                        do {
                            iframe.id = "cowebsite-iframe-" + (Math.random() + 1).toString(36).substring(7);
                        } while (this.getCoWebsiteById(iframe.id));
                    }

                    const onloadPromise = new Promise<void>((resolve) => {
                        iframe.onload = () => resolve();
                    });

                    const icon = this.generateCoWebsiteIcon(iframe);

                    const coWebsite = {
                        iframe,
                        icon,
                        position: position ?? this.coWebsites.length,
                    };

                    // Iframe management on mobile
                    icon.addEventListener("click", () => {
                        if (this.isSmallScreen()) {
                            this.moveRightPreviousCoWebsite(coWebsite, 0);
                        }
                    });

                    this.coWebsites.push(coWebsite);
                    this.cowebsiteSubIconsDom.appendChild(icon);

                    const onTimeoutPromise = new Promise<void>((resolve) => {
                        setTimeout(() => resolve(), 2000);
                    });

                    this.currentOperationPromise = this.currentOperationPromise
                        .then(() => Promise.race([onloadPromise, onTimeoutPromise]))
                        .then(() => {
                            if (coWebsite.position === 0) {
                                this.openMain();
                                if (widthPercent) {
                                    this.widthPercent = widthPercent;
                                }

                                setTimeout(() => {
                                    this.fire();
                                    position !== undefined
                                        ? this.moveRightPreviousCoWebsite(coWebsite, coWebsite.position)
                                        : this.moveCoWebsite(coWebsite, coWebsite.position);
                                }, animationTime);
                            } else {
                                position !== undefined
                                    ? this.moveRightPreviousCoWebsite(coWebsite, coWebsite.position)
                                    : this.moveCoWebsite(coWebsite, coWebsite.position);
                            }

                            return resolve(coWebsite);
                        })
                        .catch((err) => {
                            console.error("Error loadCoWebsite => ", err);
                            this.removeCoWebsiteFromStack(coWebsite);
                            return reject();
                        });
                })
                .catch((e) => console.error("Error loadCoWebsite => ", e));
        });
    }

    public closeCoWebsite(coWebsite: CoWebsite): Promise<void> {
        this.currentOperationPromise = this.currentOperationPromise.then(
            () =>
                new Promise((resolve) => {
                    if (this.coWebsites.length === 1) {
                        if (this.openedMain === iframeStates.closed) resolve(); //this method may be called twice, in case of iframe error for example
                        this.closeMain();
                        this.fire();
                    }

                    if (coWebsite) {
                        iframeListener.unregisterIframe(coWebsite.iframe);
                    }

                    this.removeCoWebsiteFromStack(coWebsite);
                    resolve();
                })
        );
        return this.currentOperationPromise;
    }

    public async closeJitsi() {
        const jitsi = this.searchJitsi();
        if (jitsi) {
            return this.closeCoWebsite(jitsi);
        }
    }

    public async closeCoWebsites(): Promise<void> {
        await this.currentOperationPromise;

        const promises: Promise<void>[] = [];
        this.coWebsites.forEach((coWebsite: CoWebsite) => {
            promises.push(this.closeCoWebsite(coWebsite));
        });
        await Promise.all(promises);
        // TODO: this.currentOperationPromise does not point any more on the last promise
        return;
    }

    public getGameSize(): { width: number; height: number } {
        if (this.openedMain !== iframeStates.opened) {
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
        const openFullscreenImage = HtmlUtils.getElementByIdOrFail(cowebsiteOpenFullScreenImageId);
        const closeFullScreenImage = HtmlUtils.getElementByIdOrFail(cowebsiteCloseFullScreenImageId);

        if (this.isFullScreen) {
            this.resetStyleMain();
            this.fire();
            //we don't trigger a resize of the phaser game since it won't be visible anyway.
            this.cowebsiteAsideHolderDom.style.visibility = "visible";
            openFullscreenImage.style.display = "inline";
            closeFullScreenImage.style.display = "none";
        } else {
            this.verticalMode ? (this.height = window.innerHeight) : (this.width = window.innerWidth);
            //we don't trigger a resize of the phaser game since it won't be visible anyway.
            this.cowebsiteAsideHolderDom.style.visibility = "hidden";
            openFullscreenImage.style.display = "none";
            closeFullScreenImage.style.display = "inline";
        }
    }
}

export const coWebsiteManager = new CoWebsiteManager();
