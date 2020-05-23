import 'phaser';
import GameConfig = Phaser.Types.Core.GameConfig;
import {DEBUG_MODE, RESOLUTION} from "./Enum/EnvironmentVariable";
import {cypressAsserter} from "./Cypress/CypressAsserter";
import {LogincScene} from "./Phaser/Login/LogincScene";
import {ReconnectingScene} from "./Phaser/Reconnecting/ReconnectingScene";
import {gameManager} from "./Phaser/Game/GameManager";

const config: GameConfig = {
    title: "Office game",
    width: window.innerWidth / RESOLUTION,
    height: window.innerHeight / RESOLUTION,
    parent: "game",
    scene: [LogincScene, ReconnectingScene],
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
