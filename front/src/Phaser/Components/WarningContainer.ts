
export const warningContainerKey = 'warningContainer';
export const warningContainerHtml = 'resources/html/warningContainer.html';

export class WarningContainer extends Phaser.GameObjects.DOMElement {
    
    constructor(scene: Phaser.Scene) {
        super(scene, 100, 0);
        this.setOrigin(0, 0);
        this.createFromCache(warningContainerKey);        
        this.scene.add.existing(this);
    }
    
}