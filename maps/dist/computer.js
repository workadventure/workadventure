import * as Phaser from 'phaser';
var Sprite = Phaser.GameObjects.Sprite;
class MySprite extends Sprite {
}
export default {
    preload: (loader) => {
        loader.atlas('computer', '/resources/items/computer/computer.png', '/resources/items/computer/computer_atlas.json');
    },
    create: (scene) => {
    },
    factory: (scene, object) => {
        // Idée: ESSAYER WebPack? https://paultavares.wordpress.com/2018/07/02/webpack-how-to-generate-an-es-module-bundle/
        let foo = new MySprite(scene, object.x, object.y, 'computer');
        scene.add.existing(foo);
        //scene.add.sprite(object.x, object.y, 'computer');
    }
};
//# sourceMappingURL=computer.js.map