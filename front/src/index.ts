import 'phaser';
import GameConfig = Phaser.Types.Core.GameConfig;
import {GameManager} from "./Phaser/Game/GameManager";
import {RESOLUTION} from "./Enum/EnvironmentVariable";

let gameManager = new GameManager();

const config: GameConfig = {
    title: "Office game",
    width: window.innerWidth / RESOLUTION,
    height: window.innerHeight / RESOLUTION,
    parent: "game",
    scene: gameManager.GameScenes,
    zoom: RESOLUTION,
};

gameManager.createGame().then(() => {
    let game = new Phaser.Game(config);

    window.addEventListener('resize', function (event) {
        game.scale.resize(window.innerWidth / RESOLUTION, window.innerHeight / RESOLUTION);
    });
});
