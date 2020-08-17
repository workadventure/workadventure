import 'phaser';
import GameConfig = Phaser.Types.Core.GameConfig;
import {DEBUG_MODE, RESOLUTION} from "./Enum/EnvironmentVariable";
import {cypressAsserter} from "./Cypress/CypressAsserter";
import {LoginScene} from "./Phaser/Login/LoginScene";
import {ReconnectingScene} from "./Phaser/Reconnecting/ReconnectingScene";
import {SelectCharacterScene} from "./Phaser/Login/SelectCharacterScene";
import {EnableCameraScene} from "./Phaser/Login/EnableCameraScene";
import {FourOFourScene} from "./Phaser/Reconnecting/FourOFourScene";
import {CustomizeScene} from "./Phaser/Login/CustomizeScene";
import {HtmlUtils} from "./WebRtc/HtmlUtils";
import {CoWebsiteManager} from "./WebRtc/CoWebsiteManager";

//CoWebsiteManager.loadCoWebsite('https://thecodingmachine.com');

const {width, height} = CoWebsiteManager.getGameSize();

const config: GameConfig = {
    title: "WorkAdventure",
    width: width / RESOLUTION,
    height: height / RESOLUTION,
    parent: "game",
    scene: [LoginScene, SelectCharacterScene, EnableCameraScene, ReconnectingScene, FourOFourScene, CustomizeScene],
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
    const {width, height} = CoWebsiteManager.getGameSize();

    game.scale.resize(width / RESOLUTION, height / RESOLUTION);
});
CoWebsiteManager.onStateChange(() => {
    const {width, height} = CoWebsiteManager.getGameSize();

    game.scale.resize(width / RESOLUTION, height / RESOLUTION);
});
