import 'phaser';
import GameConfig = Phaser.Types.Core.GameConfig;
import {DEBUG_MODE, RESOLUTION} from "./Enum/EnvironmentVariable";
import {cypressAsserter} from "./Cypress/CypressAsserter";
import {LoginScene} from "./Phaser/Login/LoginScene";
import {ReconnectingScene} from "./Phaser/Reconnecting/ReconnectingScene";
import {gameManager} from "./Phaser/Game/GameManager";
import {SelectCharacterScene} from "./Phaser/Login/SelectCharacterScene";
import {EnableCameraScene} from "./Phaser/Login/EnableCameraScene";
import {FourOFourScene} from "./Phaser/Reconnecting/FourOFourScene";

const config: GameConfig = {
    title: "Office game",
    width: window.innerWidth / RESOLUTION,
    height: window.innerHeight / RESOLUTION,
    parent: "game",
    scene: [LoginScene, SelectCharacterScene, EnableCameraScene, ReconnectingScene, FourOFourScene],
    zoom: RESOLUTION,
    physics: {
        default: "arcade",
        arcade: {
            debug: DEBUG_MODE
        }
    }
};

cypressAsserter.gameStarted();

const game = new Phaser.Game(config);

window.addEventListener('resize', function (event) {
    game.scale.resize(window.innerWidth / RESOLUTION, window.innerHeight / RESOLUTION);
});
