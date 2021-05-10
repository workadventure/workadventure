import Sprite = Phaser.GameObjects.Sprite;
import {DEPTH_UI_INDEX} from "../Game/DepthIndexes";

export interface RadialMenuItem {
    sprite: string,
    frame: number,
    name: string,
}

const menuRadius = 80;
export const RadialMenuClickEvent = 'radialClick';

export class RadialMenu extends Phaser.GameObjects.Container {
    
    constructor(scene: Phaser.Scene, x: number, y: number, private items: RadialMenuItem[]) {
        super(scene, x, y);
        this.setDepth(DEPTH_UI_INDEX)
        this.scene.add.existing(this);
        this.initItems();
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
    
}