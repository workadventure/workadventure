import * as Phaser from 'phaser';
import {Scene} from "phaser";
import Sprite = Phaser.GameObjects.Sprite;

interface ITiledMapObject {
    id: number;

    /**
     * Tile object id
     */
    gid: number;
    height: number;
    name: string;
    properties: {[key: string]: string};
    rotation: number;
    type: string;
    visible: boolean;
    width: number;
    x: number;
    y: number;

    /**
     * Whether or not object is an ellipse
     */
    ellipse: boolean;

    /**
     * Polygon points
     */
    polygon: {x: number, y: number}[];

    /**
     * Polyline points
     */
    polyline: {x: number, y: number}[];
}

class MySprite extends Sprite {

}


export default {
    preload: (loader: Phaser.Loader.LoaderPlugin) => {
        loader.atlas('computer', '/resources/items/computer/computer.png', '/resources/items/computer/computer_atlas.json');
    },
    create: (scene: Scene) => {

    },
    factory: (scene: Scene, object: ITiledMapObject) => {
        // Idée: ESSAYER WebPack? https://paultavares.wordpress.com/2018/07/02/webpack-how-to-generate-an-es-module-bundle/
        let foo = new MySprite(scene, object.x, object.y, 'computer');
        scene.add.existing(foo);
        //scene.add.sprite(object.x, object.y, 'computer');
    }
};
