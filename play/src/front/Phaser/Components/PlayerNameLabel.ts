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
        flex.style.translate = `-50% 0`;

        root.append(flex);
        flex.append(this.statusDot.element, this.playerName.element, this.megaphoneIcon.element);

        this.setOrigin(0.5).setDepth(DEPTH_INGAME_TEXT_INDEX);
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
