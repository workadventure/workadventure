import 'phaser';
import GameConfig = Phaser.Types.Core.GameConfig;
import {GameScene} from "./GameScene";

const resolution = 2;

const config: GameConfig = {
    title: "Office game",
    width: window.innerWidth / resolution,
    height: window.innerHeight / resolution,
    parent: "game",
    scene: [GameScene],
    zoom: resolution,
};

let game = new Phaser.Game(config);
