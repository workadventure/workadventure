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
 * This class is in charge of the video-conference layout.
 * It receives positioning requests for videos and does its best to place them on the screen depending on the active layout mode.
 */
class LayoutManager {
    private mode: LayoutMode = LayoutMode.Presentation;

    private importantDivs: Map<string, HTMLDivElement> = new Map<string, HTMLDivElement>();
    private normalDivs: Map<string, HTMLDivElement> = new Map<string, HTMLDivElement>();

    public add(importance: DivImportance, userId: string, html: string): void {
        const div = document.createElement('div');
        div.innerHTML = html;
        div.id = "user-"+userId;

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
            return;
        }

        div = this.normalDivs.get(userId);
        if (div !== undefined) {
            div.remove();
            this.normalDivs.delete(userId);
            this.adjustVideoChatClass();
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

    private switchLayoutMode(layoutMode: LayoutMode) {
        this.mode = layoutMode;

        if (layoutMode === LayoutMode.Presentation) {
            HtmlUtils.getElementByIdOrFail<HTMLDivElement>('sidebar').style.display = 'block';
            HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-section').style.display = 'block';
            HtmlUtils.getElementByIdOrFail<HTMLDivElement>('chat-mode').style.display = 'none';
        } else {
            HtmlUtils.getElementByIdOrFail<HTMLDivElement>('sidebar').style.display = 'none';
            HtmlUtils.getElementByIdOrFail<HTMLDivElement>('main-section').style.display = 'none';
            HtmlUtils.getElementByIdOrFail<HTMLDivElement>('chat-mode').style.display = 'block';
        }

        for (let div of this.importantDivs.values()) {
            this.positionDiv(div, DivImportance.Important);
        }
        for (let div of this.normalDivs.values()) {
            this.positionDiv(div, DivImportance.Normal);
        }
    }
}

const layoutManager = new LayoutManager();

export { layoutManager };
