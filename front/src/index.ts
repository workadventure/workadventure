import 'phaser';
import GameConfig = Phaser.Types.Core.GameConfig;
import {DEBUG_MODE, RESOLUTION} from "./Enum/EnvironmentVariable";
import {cypressAsserter} from "./Cypress/CypressAsserter";
import {LogincScene} from "./Phaser/Login/LogincScene";
import {GameScene} from "./Phaser/Game/GameScene";

const config: GameConfig = {
    title: "Office game",
    width: window.innerWidth / RESOLUTION,
    height: window.innerHeight / RESOLUTION,
    parent: "game",
    scene: [LogincScene, GameScene],
    zoom: RESOLUTION,
    physics: {
        default: "arcade",
        arcade: {
            debug: DEBUG_MODE
        }
    }
};

cypressAsserter.gameStarted();

let game = new Phaser.Game(config);

window.addEventListener('resize', function (event) {
    game.scale.resize(window.innerWidth / RESOLUTION, window.innerHeight / RESOLUTION);
});