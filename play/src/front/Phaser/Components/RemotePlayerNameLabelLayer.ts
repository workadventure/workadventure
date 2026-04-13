import { DEPTH_INGAME_TEXT_INDEX } from "../Game/DepthIndexes";
import { PlayerNameLabel } from "./PlayerNameLabel";
import DOMElement = Phaser.GameObjects.DOMElement;

export class RemotePlayerNameLabelLayer extends DOMElement {
    private readonly root: HTMLDivElement;
    private readonly labels = new Set<PlayerNameLabel>();

    constructor(scene: Phaser.Scene) {
        const root = document.createElement("div");
        root.style.position = "absolute";
        root.style.left = "0";
        root.style.top = "0";
        root.style.width = "0";
        root.style.height = "0";
        root.style.pointerEvents = "none";
        root.style.transformOrigin = "0 0";
        root.style.userSelect = "none";

        super(scene, 0, 0, root);

        this.root = root;
        this.setOrigin(0, 0).setDepth(DEPTH_INGAME_TEXT_INDEX);
    }

    public createLabel(name: string): PlayerNameLabel {
        const label = new PlayerNameLabel(this.scene, name);
        this.root.append(label.element);
        this.labels.add(label);
        return label;
    }

    public removeLabel(label: PlayerNameLabel): void {
        if (!this.labels.has(label)) {
            return;
        }
        label.destroy();
        this.labels.delete(label);
    }

    public destroy(): void {
        for (const label of this.labels) {
            label.destroy();
        }
        this.labels.clear();
        super.destroy();
    }
}
