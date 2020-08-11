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
export class LayoutManager {
    private mode: LayoutMode = LayoutMode.Presentation;

    private importantDivs: Map<string, HTMLDivElement> = new Map<string, HTMLDivElement>();
    private normalDivs: Map<string, HTMLDivElement> = new Map<string, HTMLDivElement>();

    public add(importance: DivImportance, userId: string, html: string): void {
        const div = document.createElement('div');
        div.append(html);
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
        let div = this.importantDivs.get(userId);
        if (div !== undefined) {
            div.remove();
            this.importantDivs.delete(userId);
            return;
        }

        div = this.normalDivs.get(userId);
        if (div !== undefined) {
            div.remove();
            this.normalDivs.delete(userId);
            return;
        }

        throw new Error('Could not find user ID "'+userId+'"');
    }

    private switchLayoutMode(layoutMode: LayoutMode) {
        this.mode = layoutMode;

        for (let div of this.importantDivs.values()) {
            this.positionDiv(div, DivImportance.Important);
        }
        for (let div of this.normalDivs.values()) {
            this.positionDiv(div, DivImportance.Normal);
        }
    }
}
