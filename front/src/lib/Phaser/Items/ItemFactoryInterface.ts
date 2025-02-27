import type { ITiledMapObject } from "@workadventure/tiled-map-type-guard";
import type { GameScene } from "../Game/GameScene";
import type { ActionableItem } from "./ActionableItem";
import LoaderPlugin = Phaser.Loader.LoaderPlugin;

export interface ItemFactoryInterface {
    preload: (loader: LoaderPlugin) => void;
    create: (scene: GameScene) => void;
    factory: (scene: GameScene, object: ITiledMapObject, state: unknown) => ActionableItem;
}
