import * as Phaser from 'phaser';
import {Scene} from "phaser";
import Sprite = Phaser.GameObjects.Sprite;
import {ITiledMapObject} from "../../Map/ITiledMap";
import {ItemFactoryInterface} from "../ItemFactoryInterface";
import {GameScene} from "../../Game/GameScene";
import {ActionableItem} from "../ActionableItem";

export default {
    preload: (loader: Phaser.Loader.LoaderPlugin): void => {
        loader.atlas('computer', 'http://maps.workadventure.localhost/computer/computer.png', 'http://maps.workadventure.localhost/computer/computer_atlas.json');
    },
    create: (scene: GameScene): void => {

    },
    factory: (scene: GameScene, object: ITiledMapObject): ActionableItem => {
        // Idée: ESSAYER WebPack? https://paultavares.wordpress.com/2018/07/02/webpack-how-to-generate-an-es-module-bundle/
        let foo = new Sprite(scene, object.x, object.y, 'computer');
        scene.add.existing(foo);

        return new ActionableItem(foo, 32);
        //scene.add.sprite(object.x, object.y, 'computer');
    }
} as ItemFactoryInterface;
