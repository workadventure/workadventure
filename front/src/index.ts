import 'phaser';
import GameConfig = Phaser.Types.Core.GameConfig;
import {GameScene} from "./Phaser/GameScene";
import {Connexion} from "./Connexion";
import {RESOLUTION} from "./Enum/EnvironmentVariable";

const config: GameConfig = {
    title: "Office game",
    width: window.innerWidth / RESOLUTION,
    height: window.innerHeight / RESOLUTION,
    parent: "game",
    scene: [GameScene],
    zoom: RESOLUTION,
};

let game = new Phaser.Game(config);

window.addEventListener('resize', function (event) {
    game.scale.resize(window.innerWidth / RESOLUTION, window.innerHeight / RESOLUTION);
});

const connexion = new Connexion("test@gmail.com");
