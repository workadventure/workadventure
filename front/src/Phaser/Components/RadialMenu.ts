import Sprite = Phaser.GameObjects.Sprite;
import {DEPTH_UI_INDEX} from "../Game/DepthIndexes";
import {waScaleManager} from "../Services/WaScaleManager";

export interface RadialMenuItem {
    sprite: string,
    frame: number,
    name: string,
}

const menuRadius = 60;
export const RadialMenuClickEvent = 'radialClick';

export class RadialMenu extends Phaser.GameObjects.Container {
    private resizeCallback: OmitThisParameter<() => void>;
    
    constructor(scene: Phaser.Scene, x: number, y: number, private items: RadialMenuItem[]) {
        super(scene, x, y);
        this.setDepth(DEPTH_UI_INDEX)
        this.scene.add.existing(this);
        this.initItems();

        this.resize();
        this.resizeCallback = this.resize.bind(this);
        this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.resizeCallback);
    }
    
    private initItems() {
        const itemsNumber = this.items.length;
        this.items.forEach((item, index) => this.createRadialElement(item, index, itemsNumber))
    }
    
    private createRadialElement(item: RadialMenuItem, index: number, itemsNumber: number) {
        const image = new Sprite(this.scene, 0,  menuRadius, item.sprite, item.frame);
        this.add(image);
        this.scene.sys.updateList.add(image);
        image.setDepth(DEPTH_UI_INDEX)
        image.setInteractive({
            hitArea: new Phaser.Geom.Circle(0, 0, 25),
            hitAreaCallback: Phaser.Geom.Circle.Contains, //eslint-disable-line @typescript-eslint/unbound-method
            useHandCursor: true,
        });
        image.on('pointerdown', () => this.emit(RadialMenuClickEvent, item));
        image.on('pointerover', () => {
            this.scene.tweens.add({
                targets: image,
                scale: 2,
                duration: 500,
                ease: 'Power3',
            })
        });
        image.on('pointerout', () => {
            this.scene.tweens.add({
                targets: image,
                scale: 1,
                duration: 500,
                ease: 'Power3',
            })
        });
        const angle = 2 * Math.PI * index / itemsNumber;
        Phaser.Actions.RotateAroundDistance([image], {x: 0, y: 0}, angle, menuRadius);
    }

    private resize() {
        this.setScale(waScaleManager.uiScalingFactor);
    }

    public destroy() {
        this.scene.scale.removeListener(Phaser.Scale.Events.RESIZE, this.resizeCallback);
        super.destroy();
    }
}