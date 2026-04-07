import { AvailabilityStatus } from "@workadventure/messages";
import { DEPTH_INGAME_TEXT_INDEX } from "../Game/DepthIndexes";
import { MegaphoneIcon } from "./MegaphoneIcon";
import { PlayerName } from "./PlayerName";
import { PlayerStatusDot } from "./PlayerStatusDot";
import DOMElement = Phaser.GameObjects.DOMElement;

const iconGapSize = 3;

export class PlayerNameLabel extends DOMElement {
    private readonly playerName: PlayerName;
    private readonly statusDot: PlayerStatusDot;
    private readonly megaphoneIcon: MegaphoneIcon;
    private readonly content: HTMLDivElement;
    private contentScale = 1;

    constructor(scene: Phaser.Scene, x: number, y: number, name: string) {
        const root = document.createElement("div");
        super(scene, x, y, root);

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

        this.setOrigin(0.5).setDepth(DEPTH_INGAME_TEXT_INDEX);
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
}
