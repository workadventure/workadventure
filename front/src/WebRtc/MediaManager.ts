import { layoutManager } from "./LayoutManager";
import { HtmlUtils } from "./HtmlUtils";
import type { UserInputManager } from "../Phaser/UserInput/UserInputManager";
import { localStreamStore } from "../Stores/MediaStore";
import { screenSharingLocalStreamStore } from "../Stores/ScreenSharingStore";
import { helpCameraSettingsVisibleStore } from "../Stores/HelpCameraSettingsStore";

export type StartScreenSharingCallback = (media: MediaStream) => void;
export type StopScreenSharingCallback = (media: MediaStream) => void;

import { cowebsiteCloseButtonId } from "./CoWebsiteManager";
import { gameOverlayVisibilityStore } from "../Stores/GameOverlayStoreVisibility";

export class MediaManager {
    startScreenSharingCallBacks: Set<StartScreenSharingCallback> = new Set<StartScreenSharingCallback>();
    stopScreenSharingCallBacks: Set<StopScreenSharingCallback> = new Set<StopScreenSharingCallback>();

    private triggerCloseJistiFrame: Map<String, Function> = new Map<String, Function>();

    private userInputManager?: UserInputManager;

    constructor() {
        localStreamStore.subscribe((result) => {
            if (result.type === "error") {
                console.error(result.error);
                layoutManager.addInformation(
                    "warning",
                    "Camera access denied. Click here and check your browser permissions.",
                    () => {
                        helpCameraSettingsVisibleStore.set(true);
                    },
                    this.userInputManager
                );
                return;
            }
        });

        screenSharingLocalStreamStore.subscribe((result) => {
            if (result.type === "error") {
                console.error(result.error);
                layoutManager.addInformation(
                    "warning",
                    "Screen sharing denied. Click here and check your browser permissions.",
                    () => {
                        helpCameraSettingsVisibleStore.set(true);
                    },
                    this.userInputManager
                );
                return;
            }
        });
    }

    public showGameOverlay(): void {
        const gameOverlay = HtmlUtils.getElementByIdOrFail("game-overlay");
        gameOverlay.classList.add("active");

        const buttonCloseFrame = HtmlUtils.getElementByIdOrFail(cowebsiteCloseButtonId);
        const functionTrigger = () => {
            this.triggerCloseJitsiFrameButton();
        };
        buttonCloseFrame.removeEventListener("click", () => {
            buttonCloseFrame.blur();
            functionTrigger();
        });

        gameOverlayVisibilityStore.showGameOverlay();
    }

    public hideGameOverlay(): void {
        const gameOverlay = HtmlUtils.getElementByIdOrFail("game-overlay");
        gameOverlay.classList.remove("active");

        const buttonCloseFrame = HtmlUtils.getElementByIdOrFail(cowebsiteCloseButtonId);
        const functionTrigger = () => {
            this.triggerCloseJitsiFrameButton();
        };
        buttonCloseFrame.addEventListener("click", () => {
            buttonCloseFrame.blur();
            functionTrigger();
        });

        gameOverlayVisibilityStore.hideGameOverlay();
    }

    private getScreenSharingId(userId: string): string {
        return `screen-sharing-${userId}`;
    }

    disabledMicrophoneByUserId(userId: number) {
        const element = document.getElementById(`microphone-${userId}`);
        if (!element) {
            return;
        }
        element.classList.add("active"); //todo: why does a method 'disable' add a class 'active'?
    }

    enabledMicrophoneByUserId(userId: number) {
        const element = document.getElementById(`microphone-${userId}`);
        if (!element) {
            return;
        }
        element.classList.remove("active"); //todo: why does a method 'enable' remove a class 'active'?
    }

    disabledVideoByUserId(userId: number) {
        let element = document.getElementById(`${userId}`);
        if (element) {
            element.style.opacity = "0";
        }
        element = document.getElementById(`name-${userId}`);
        if (element) {
            element.style.display = "block";
        }
    }

    enabledVideoByUserId(userId: number) {
        let element = document.getElementById(`${userId}`);
        if (element) {
            element.style.opacity = "1";
        }
        element = document.getElementById(`name-${userId}`);
        if (element) {
            element.style.display = "none";
        }
    }

    toggleBlockLogo(userId: number, show: boolean): void {
        const blockLogoElement = HtmlUtils.getElementByIdOrFail<HTMLImageElement>("blocking-" + userId);
        show ? blockLogoElement.classList.add("active") : blockLogoElement.classList.remove("active");
    }

    isError(userId: string): void {
        console.info("isError", `div-${userId}`);
        const element = document.getElementById(`div-${userId}`);
        if (!element) {
            return;
        }
        const errorDiv = element.getElementsByClassName("rtc-error").item(0) as HTMLDivElement | null;
        if (errorDiv === null) {
            return;
        }
        errorDiv.style.display = "block";
    }
    isErrorScreenSharing(userId: string): void {
        this.isError(this.getScreenSharingId(userId));
    }

    private getSpinner(userId: string): HTMLDivElement | null {
        const element = document.getElementById(`div-${userId}`);
        if (!element) {
            return null;
        }
        const connectingSpinnerDiv = element
            .getElementsByClassName("connecting-spinner")
            .item(0) as HTMLDivElement | null;
        return connectingSpinnerDiv;
    }

    public addTriggerCloseJitsiFrameButton(id: String, Function: Function) {
        this.triggerCloseJistiFrame.set(id, Function);
    }

    public removeTriggerCloseJitsiFrameButton(id: String) {
        this.triggerCloseJistiFrame.delete(id);
    }

    private triggerCloseJitsiFrameButton(): void {
        for (const callback of this.triggerCloseJistiFrame.values()) {
            callback();
        }
    }

    public setUserInputManager(userInputManager: UserInputManager) {
        this.userInputManager = userInputManager;
    }

    public hasNotification(): boolean {
        return Notification.permission === "granted";
    }

    public requestNotification() {
        if (window.Notification && Notification.permission !== "granted") {
            return Notification.requestPermission();
        } else {
            return Promise.reject();
        }
    }

    public createNotification(userName: string) {
        if (document.hasFocus()) {
            return;
        }

        if (this.hasNotification()) {
            const title = `${userName} wants to discuss with you`;
            const options = {
                icon: "/resources/logos/logo-WA-min.png",
                image: "/resources/logos/logo-WA-min.png",
                badge: "/resources/logos/logo-WA-min.png",
            };
            new Notification(title, options);
        }
    }
}

export const mediaManager = new MediaManager();
