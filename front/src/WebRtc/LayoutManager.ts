import {HtmlUtils} from "./HtmlUtils";

export enum LayoutMode {
    // All videos are displayed on the right side of the screen. If there is a screen sharing, it is displayed in the middle.
    Presentation = "Presentation",
    // Videos take the whole page.
    VideoChat = "VideoChat",
}

export enum DivImportance {
    // For screen sharing
    Important = "Important",
    // For normal video
    Normal = "Normal",
}

/**
 * Classes implementing this interface can be notified when the center of the screen (the player position) should be
 * changed.
 */
export interface CenterListener {
    onCenterChange(): void;
}

/**
 * This class is in charge of the video-conference layout.
 * It receives positioning requests for videos and does its best to place them on the screen depending on the active layout mode.
 */
class LayoutManager {
    private mode: LayoutMode = LayoutMode.Presentation;

    private importantDivs: Map<string, HTMLDivElement> = new Map<string, HTMLDivElement>();
    private normalDivs: Map<string, HTMLDivElement> = new Map<string, HTMLDivElement>();
    private listener: CenterListener|null = null;

    public setListener(centerListener: CenterListener|null) {
        this.listener = centerListener;
    }

    public add(importance: DivImportance, userId: string, html: string): void {
        const div = document.createElement('div');
        div.innerHTML = html;
        div.id = "user-"+userId;
        div.className = "media-container"

        if (importance === DivImportance.Important) {
            this.importantDivs.set(userId, div);

            // If this is the first video with high importance, let's switch mode automatically.
            if (this.importantDivs.size === 1 && this.mode === LayoutMode.VideoChat) {
                this.switchLayoutMode(LayoutMode.Presentation);
            }
        } else if (importance === DivImportance.Normal) {
            this.normalDivs.set(userId, div);
        } else {
            throw new Error('Unexpected importance');
        }

        this.positionDiv(div, importance);
        this.adjustVideoChatClass();
        this.listener?.onCenterChange();
    }

    private positionDiv(elem: HTMLDivElement, importance: DivImportance): void {
        if (this.mode === LayoutMode.VideoChat) {
            const chatModeDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('chat-mode');
            chatModeDiv.appendChild(elem);
        } else {
            if (importance === DivImportance.Important) {
                const mainSectionDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-section');
                mainSectionDiv.appendChild(elem);
            } else if (importance === DivImportance.Normal) {
                const sideBarDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('sidebar');
                sideBarDiv.appendChild(elem);
            }
        }
    }

    /**
     * Removes the DIV matching userId.
     */
    public remove(userId: string): void {
        console.log('Removing video for userID '+userId+'.');
        let div = this.importantDivs.get(userId);
        if (div !== undefined) {
            div.remove();
            this.importantDivs.delete(userId);
            this.adjustVideoChatClass();
            this.listener?.onCenterChange();
            return;
        }

        div = this.normalDivs.get(userId);
        if (div !== undefined) {
            div.remove();
            this.normalDivs.delete(userId);
            this.adjustVideoChatClass();
            this.listener?.onCenterChange();
            return;
        }

        console.log('Cannot remove userID '+userId+'. Already removed?');
        //throw new Error('Could not find user ID "'+userId+'"');
    }

    private adjustVideoChatClass(): void {
        const chatModeDiv = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('chat-mode');
        chatModeDiv.classList.remove('one-col', 'two-col', 'three-col', 'four-col');

        const nbUsers = this.importantDivs.size + this.normalDivs.size;

        if (nbUsers <= 1) {
            chatModeDiv.classList.add('one-col');
        } else if (nbUsers <= 4) {
            chatModeDiv.classList.add('two-col');
        } else if (nbUsers <= 9) {
            chatModeDiv.classList.add('three-col');
        } else {
            chatModeDiv.classList.add('four-col');
        }
    }

    public switchLayoutMode(layoutMode: LayoutMode) {
        this.mode = layoutMode;

        if (layoutMode === LayoutMode.Presentation) {
            HtmlUtils.getElementByIdOrFail<HTMLDivElement>('sidebar').style.display = 'flex';
            HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-section').style.display = 'flex';
            HtmlUtils.getElementByIdOrFail<HTMLDivElement>('chat-mode').style.display = 'none';
        } else {
            HtmlUtils.getElementByIdOrFail<HTMLDivElement>('sidebar').style.display = 'none';
            HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-section').style.display = 'none';
            HtmlUtils.getElementByIdOrFail<HTMLDivElement>('chat-mode').style.display = 'flex';
        }

        for (const div of this.importantDivs.values()) {
            this.positionDiv(div, DivImportance.Important);
        }
        for (const div of this.normalDivs.values()) {
            this.positionDiv(div, DivImportance.Normal);
        }
        this.listener?.onCenterChange();
    }

    public getLayoutMode(): LayoutMode {
        return this.mode;
    }

    /*public getGameCenter(): {x: number, y: number} {

    }*/

    /**
     * Tries to find the biggest available box of remaining space (this is a space where we can center the character)
     */
    public findBiggestAvailableArray(): {xStart: number, yStart: number, xEnd: number, yEnd: number} {
        if (this.mode === LayoutMode.VideoChat) {
            const children = document.querySelectorAll<HTMLDivElement>('div.chat-mode > div');
            const htmlChildren = Array.from(children.values());

            // No chat? Let's go full center
            if (htmlChildren.length === 0) {
                return {
                    xStart: 0,
                    yStart: 0,
                    xEnd: window.innerWidth,
                    yEnd: window.innerHeight
                }
            }

            const lastDiv = htmlChildren[htmlChildren.length - 1];
            // Compute area between top right of the last div and bottom right of window
            const area1 = (window.innerWidth - (lastDiv.offsetLeft + lastDiv.offsetWidth))
                          * (window.innerHeight - lastDiv.offsetTop);

            // Compute area between bottom of last div and bottom of the screen on whole width
            const area2 = window.innerWidth
                * (window.innerHeight - (lastDiv.offsetTop + lastDiv.offsetHeight));

            if (area1 < 0 && area2 < 0) {
                // If screen is full, let's not attempt something foolish and simply center character in the middle.
                return {
                    xStart: 0,
                    yStart: 0,
                    xEnd: window.innerWidth,
                    yEnd: window.innerHeight
                }
            }
            if (area1 <= area2) {
                console.log('lastDiv', lastDiv.offsetTop, lastDiv.offsetHeight);
                return {
                    xStart: 0,
                    yStart: lastDiv.offsetTop + lastDiv.offsetHeight,
                    xEnd: window.innerWidth,
                    yEnd: window.innerHeight
                }
            } else {
                console.log('lastDiv', lastDiv.offsetTop);
                return {
                    xStart: lastDiv.offsetLeft + lastDiv.offsetWidth,
                    yStart: lastDiv.offsetTop,
                    xEnd: window.innerWidth,
                    yEnd: window.innerHeight
                }
            }
        } else {
            // Possible destinations: at the center bottom or at the right bottom.
            const mainSectionChildren = Array.from(document.querySelectorAll<HTMLDivElement>('div.main-section > div').values());
            const sidebarChildren = Array.from(document.querySelectorAll<HTMLDivElement>('aside.sidebar > div').values());

            // Nothing? Let's center
            if (mainSectionChildren.length === 0 && sidebarChildren.length === 0) {
                return {
                    xStart: 0,
                    yStart: 0,
                    xEnd: window.innerWidth,
                    yEnd: window.innerHeight
                }
            }

            if (mainSectionChildren.length === 0) {
                const lastSidebarDiv = sidebarChildren[sidebarChildren.length-1];

                // No presentation? Let's center on the main-section space
                return {
                    xStart: 0,
                    yStart: 0,
                    xEnd: lastSidebarDiv.offsetLeft,
                    yEnd: window.innerHeight
                }
            }

            // At this point, we know we have at least one element in the main section.
            const lastPresentationDiv = mainSectionChildren[mainSectionChildren.length-1];

            const presentationArea = (window.innerHeight - (lastPresentationDiv.offsetTop + lastPresentationDiv.offsetHeight))
                                     * (lastPresentationDiv.offsetLeft + lastPresentationDiv.offsetWidth);

            let leftSideBar: number;
            let bottomSideBar: number;
            if (sidebarChildren.length === 0) {
                leftSideBar = HtmlUtils.getElementByIdOrFail<HTMLDivElement>('sidebar').offsetLeft;
                bottomSideBar = 0;
            } else {
                const lastSideBarChildren = sidebarChildren[sidebarChildren.length - 1];
                leftSideBar = lastSideBarChildren.offsetLeft;
                bottomSideBar = lastSideBarChildren.offsetTop + lastSideBarChildren.offsetHeight;
            }
            const sideBarArea = (window.innerWidth - leftSideBar)
                * (window.innerHeight - bottomSideBar);

            if (presentationArea <= sideBarArea) {
                return {
                    xStart: leftSideBar,
                    yStart: bottomSideBar,
                    xEnd: window.innerWidth,
                    yEnd: window.innerHeight
                }
            } else {
                return {
                    xStart: 0,
                    yStart: lastPresentationDiv.offsetTop + lastPresentationDiv.offsetHeight,
                    xEnd: /*lastPresentationDiv.offsetLeft + lastPresentationDiv.offsetWidth*/ window.innerWidth , // To avoid flickering when a chat start, we center on the center of the screen, not the center of the main content area
                    yEnd: window.innerHeight
                }
            }
        }
    }
}

const layoutManager = new LayoutManager();

export { layoutManager };
