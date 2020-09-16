import LoaderPlugin = Phaser.Loader.LoaderPlugin;
import {GameScene} from "../Game/GameScene";
import {ITiledMapObject} from "../Map/ITiledMap";
import {ActionableItem} from "./ActionableItem";

export interface ItemFactoryInterface {
    preload: (loader: LoaderPlugin) => void;
    create: (scene: GameScene) => void;
    factory: (scene: GameScene, object: ITiledMapObject, state: unknown) => ActionableItem;
}
