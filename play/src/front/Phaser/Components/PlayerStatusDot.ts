import { AvailabilityStatus } from "@workadventure/messages";
import { getColorOfStatus } from "../../Utils/AvailabilityStatus";

const statusDotSize = 8;
const statusDotInsideUrl = "/resources/icons/icon_status_indicator_inside.png";
const statusDotOutlineUrl = "/resources/icons/icon_status_indicator_outline.png";

export class PlayerStatusDot {
    public readonly element: HTMLSpanElement;
    private readonly insideLayer: HTMLSpanElement;
    private readonly outlineLayer: HTMLSpanElement;

    private _availabilityStatus: AvailabilityStatus;

    constructor(_scene: Phaser.Scene) {
        this._availabilityStatus = AvailabilityStatus.ONLINE;

        const element = document.createElement("span");
        element.style.position = "relative";
        element.style.display = "inline-block";
        element.style.width = `${statusDotSize}px`;
        element.style.height = `${statusDotSize}px`;
        element.style.flex = "0 0 auto";
        element.style.pointerEvents = "none";
        element.style.userSelect = "none";
        element.style.transformOrigin = "center";

        const outlineLayer = this.createLayer(statusDotOutlineUrl);
        const insideLayer = this.createLayer(statusDotInsideUrl);
        element.append(insideLayer, outlineLayer);

        this.element = element;
        this.insideLayer = insideLayer;
        this.outlineLayer = outlineLayer;

        this.redraw();
    }

    public setAvailabilityStatus(availabilityStatus: AvailabilityStatus, instant = false): void {
        if (this._availabilityStatus === availabilityStatus || availabilityStatus === AvailabilityStatus.UNCHANGED) {
            return;
        }

        this._availabilityStatus = availabilityStatus;
        if (instant) {
            this.redraw();
        } else {
            this.playStatusChangeAnimation();
        }
    }

    public get availabilityStatus(): AvailabilityStatus {
        return this._availabilityStatus;
    }

    private playStatusChangeAnimation(): void {
        this.redraw();
        this.element.animate?.([{ transform: "scale(1)" }, { transform: "scale(0)" }, { transform: "scale(1)" }], {
            duration: 200,
            easing: "ease-in",
        });
    }

    private redraw(): void {
        const colors = getColorOfStatus(this._availabilityStatus);
        this.insideLayer.style.backgroundColor = this.toCssColor(colors.filling);
        this.outlineLayer.style.backgroundColor = this.toCssColor(colors.outline);
    }

    private createLayer(maskUrl: string): HTMLSpanElement {
        const layer = document.createElement("span");
        layer.style.position = "absolute";
        layer.style.inset = "0";
        layer.style.display = "block";
        layer.style.imageRendering = "pixelated";
        layer.style.backgroundRepeat = "no-repeat";
        layer.style.backgroundPosition = "center";
        layer.style.backgroundSize = "100% 100%";
        layer.style.maskRepeat = "no-repeat";
        layer.style.maskPosition = "center";
        layer.style.maskSize = "100% 100%";
        layer.style.maskImage = `url("${maskUrl}")`;
        return layer;
    }

    private toCssColor(color: number): string {
        return `#${color.toString(16).padStart(6, "0")}`;
    }
}
