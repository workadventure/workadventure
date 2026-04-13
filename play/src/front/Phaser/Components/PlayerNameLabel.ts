import { AvailabilityStatus } from "@workadventure/messages";
import { MegaphoneIcon } from "./MegaphoneIcon";
import { PlayerName } from "./PlayerName";
import { PlayerStatusDot } from "./PlayerStatusDot";

const iconGapSize = 3;

export class PlayerNameLabel {
    private readonly playerName: PlayerName;
    private readonly statusDot: PlayerStatusDot;
    private readonly megaphoneIcon: MegaphoneIcon;
    private readonly content: HTMLDivElement;
    public readonly element: HTMLDivElement;
    private contentScale = 1;
    private lastX = 0;
    private lastY = 0;

    constructor(scene: Phaser.Scene, name: string) {
        const root = document.createElement("div");
        root.style.position = "absolute";
        root.style.left = "0";
        root.style.top = "0";
        root.style.transform = "translate(0px, 0px)";
        root.style.transformOrigin = "0 0";
        root.style.pointerEvents = "none";
        root.style.userSelect = "none";

        this.statusDot = new PlayerStatusDot(scene);
        this.playerName = new PlayerName(name);
        this.megaphoneIcon = new MegaphoneIcon(scene);

        const flex = document.createElement("div");
        flex.style.display = "flex";
        flex.style.flexDirection = "row";
        flex.style.alignItems = "center";
        flex.style.gap = `${iconGapSize}px`;
        flex.style.transform = "translateX(-50%)";
        flex.style.transformOrigin = "center bottom";

        root.append(flex);
        flex.append(this.statusDot.element, this.playerName.element, this.megaphoneIcon.element);
        this.content = flex;
        this.element = root;
    }

    public setPosition(x: number, y: number): void {
        if (this.lastX === x && this.lastY === y) {
            return;
        }
        this.lastX = x;
        this.lastY = y;
        this.element.style.transform = `translate(${x}px, ${y}px)`;
    }

    public setZoomCompensation(zoomModifier: number): void {
        const contentScale = Math.max(zoomModifier > 0 ? 0.8 / zoomModifier : 1, 1);
        if (this.contentScale === contentScale) {
            return;
        }

        this.contentScale = contentScale;
        this.content.style.transform = `translateX(-50%) scale(${contentScale})`;
    }

    public setOutline(color: number | undefined): void {
        this.playerName.setOutline(color);
    }

    public setAvailabilityStatus(availabilityStatus: AvailabilityStatus, instant = false): void {
        if (
            this.statusDot.availabilityStatus === availabilityStatus ||
            availabilityStatus === AvailabilityStatus.UNCHANGED
        ) {
            return;
        }

        this.statusDot.setAvailabilityStatus(availabilityStatus, instant);
        this.megaphoneIcon.show(availabilityStatus === AvailabilityStatus.SPEAKER, false, instant);
    }

    public get availabilityStatus(): AvailabilityStatus {
        return this.statusDot.availabilityStatus;
    }

    public destroy(): void {
        if (this.element.parentElement) {
            this.element.remove();
        }
    }
}
