import * as Phaser from "phaser";
import {Sprite} from "../Entity/Sprite";

export interface RadialMenuItem {
    name: string;
    textureKey: string;
}

export class RadialMenu extends Phaser.GameObjects.Container {
    //private itemZones: Phaser.GameObjects.Zone[] = [];
    
    constructor(scene: Phaser.Scene, x: number, y: number, private items:RadialMenuItem[]) {
        super(scene, x, y);
        

        const itemNumber = this.items.length;
        if (itemNumber < 1) {
            throw 'RadialMenu need at least one item!';
        }
        this.items.forEach((item, index) => {
            //create a zone vertical on the top on the menu
            const zone = new Phaser.GameObjects.Zone(scene, 0, 20, 100, 20);
            zone.setOrigin(0.5, 0);
            zone.setInteractive();//todo: use setInteractive to define a part-circle shape
            this.add(zone);
            const image = new Sprite(this.scene, 0,  100, item.textureKey, 1);
            image.setOrigin(0.5, 0);
            image.setDepth(99999);
            this.add(image);
            
            
            
            
            //rotate them
            zone.angle = index * 360 / itemNumber;
            image.angle = index * 360 / itemNumber;

            scene.add.existing(this);
        })
    }
    
    /*public unfold(): void {
        
    }
    
    public fold(): void {
        
    }*/
}