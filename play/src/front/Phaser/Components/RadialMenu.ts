import { DEPTH_UI_INDEX } from "../Game/DepthIndexes";
import { waScaleManager } from "../Services/WaScaleManager";
import Sprite = Phaser.GameObjects.Sprite;

export interface RadialMenuItem {
    image: string;
    name: string;
}

export const RadialMenuClickEvent = "radialClick";

export class RadialMenu extends Phaser.GameObjects.Container {
    private resizeCallback: OmitThisParameter<() => void>;

    constructor(scene: Phaser.Scene, x: number, y: number, private items: RadialMenuItem[]) {
        super(scene, x, y);
        this.setDepth(DEPTH_UI_INDEX);
        this.scene.add.existing(this);
        this.initItems();

        this.resize();
        this.resizeCallback = this.resize.bind(this);
        this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.resizeCallback);
    }

    private initItems() {
        const itemsNumber = this.items.length;
        const menuRadius = 70 + (waScaleManager.uiScalingFactor - 1) * 20;
        this.items.forEach((item, index) => this.createRadialElement(item, index, itemsNumber, menuRadius));
    }

    private createRadialElement(item: RadialMenuItem, index: number, itemsNumber: number, menuRadius: number) {
        const image = new Sprite(this.scene, 0, menuRadius, item.image);
        this.add(image);
        this.scene.sys.updateList.add(image);
        const scalingFactor = waScaleManager.uiScalingFactor * 0.075;
        image.setScale(scalingFactor);
        image.setInteractive({
            useHandCursor: true,
        });
        image.on("pointerdown", () => this.emit(RadialMenuClickEvent, item));
        image.on("pointerover", () => {
            this.scene.tweens.add({
                targets: image,
                props: {
                    scale: 2 * scalingFactor,
                },
                duration: 500,
                ease: "Power3",
            });
        });
        image.on("pointerout", () => {
            this.scene.tweens.add({
                targets: image,
                props: {
                    scale: scalingFactor,
                },
                duration: 500,
                ease: "Power3",
            });
        });
        const angle = (2 * Math.PI * index) / itemsNumber;
        Phaser.Actions.RotateAroundDistance([image], { x: 0, y: 0 }, angle, menuRadius);
    }

    private resize() {
        this.setScale(waScaleManager.uiScalingFactor);
    }

    public destroy() {
        this.scene.scale.removeListener(Phaser.Scale.Events.RESIZE, this.resizeCallback);
        super.destroy();
    }
}
