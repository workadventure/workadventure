import { AvailabilityStatus } from "@workadventure/messages";
import { getColorOfStatus } from "../../Utils/AvailabilityStatus";

const STATUS_DOT_BORDER_WIDTH = 1;

const colorNumberToHex = (color: number): string => `#${color.toString(16).padStart(6, "0")}`;

export class UsernameStatusDisplay {
    public readonly element: HTMLSpanElement;

    private availabilityStatusValue = AvailabilityStatus.ONLINE;
    private animation?: Animation;
    private redrawTimeout: number | undefined;

    constructor() {
        this.element = document.createElement("span");
        this.element.style.position = "relative";
        this.element.style.display = "inline-flex";
        this.element.style.alignItems = "center";
        this.element.style.justifyContent = "center";
        this.element.style.flex = "0 0 auto";
        this.element.style.height = `50%`;
        this.element.style.aspectRatio = "1 / 1";
        this.element.style.borderRadius = "50%";
        this.element.style.boxSizing = "border-box";
        this.redraw();
    }

    public setAvailabilityStatus(availabilityStatus: AvailabilityStatus, instant = false): void {
        if (
            this.availabilityStatusValue === availabilityStatus ||
            availabilityStatus === AvailabilityStatus.UNCHANGED
        ) {
            return;
        }

        this.availabilityStatusValue = availabilityStatus;
        if (instant) {
            this.stopAnimation();
            this.redraw();
            return;
        }

        this.playStatusChangeAnimation();
    }

    public destroy(): void {
        this.stopAnimation();
        this.element.remove();
    }

    private playStatusChangeAnimation(): void {
        this.stopAnimation();

        this.animation = this.element.animate(
            [{ transform: "scale(1)" }, { transform: "scale(0.25)" }, { transform: "scale(1)" }],
            {
                duration: 300,
                easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            },
        );

        this.redrawTimeout = window.setTimeout(() => {
            this.redraw();
            this.redrawTimeout = undefined;
        }, 150);

        this.animation.onfinish = () => {
            this.animation = undefined;
            this.element.style.transform = "";
        };
    }

    private stopAnimation(): void {
        this.animation?.cancel();
        this.animation = undefined;

        if (this.redrawTimeout !== undefined) {
            window.clearTimeout(this.redrawTimeout);
            this.redrawTimeout = undefined;
        }

        this.element.style.transform = "";
    }

    private redraw(): void {
        const colors = getColorOfStatus(this.availabilityStatusValue);
        this.element.style.backgroundColor = colorNumberToHex(colors.filling);
        this.element.style.border = `calc(${STATUS_DOT_BORDER_WIDTH}px * var(--username-dom-scale, 1)) solid ${colorNumberToHex(
            colors.outline,
        )}`;
    }

    get availabilityStatus(): AvailabilityStatus {
        return this.availabilityStatusValue;
    }
}
