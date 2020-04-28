import 'phaser';
import GameConfig = Phaser.Types.Core.GameConfig;
import {gameManager, GameManager} from "./Phaser/Game/GameManager";
import {DEBUG_MODE, RESOLUTION} from "./Enum/EnvironmentVariable";
import {cypressAsserter} from "./Cypress/CypressAsserter";
import {LogincScene} from "./Phaser/Login/LogincScene";

const config: GameConfig = {
    title: "Office game",
    width: window.innerWidth / RESOLUTION,
    height: window.innerHeight / RESOLUTION,
    parent: "game",
    scene: [LogincScene, ...gameManager.GameScenes as any],
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