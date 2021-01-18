import 'phaser';
import GameConfig = Phaser.Types.Core.GameConfig;
import {DEBUG_MODE, JITSI_URL, RESOLUTION} from "./Enum/EnvironmentVariable";
import {cypressAsserter} from "./Cypress/CypressAsserter";
import {LoginScene} from "./Phaser/Login/LoginScene";
import {ReconnectingScene} from "./Phaser/Reconnecting/ReconnectingScene";
import {SelectCharacterScene} from "./Phaser/Login/SelectCharacterScene";
import {EnableCameraScene} from "./Phaser/Login/EnableCameraScene";
import WebGLRenderer = Phaser.Renderer.WebGL.WebGLRenderer;
import {OutlinePipeline} from "./Phaser/Shaders/OutlinePipeline";
import {CustomizeScene} from "./Phaser/Login/CustomizeScene";
import {ResizableScene} from "./Phaser/Login/ResizableScene";
import {EntryScene} from "./Phaser/Login/EntryScene";
import {coWebsiteManager} from "./WebRtc/CoWebsiteManager";
import {MenuScene} from "./Phaser/Menu/MenuScene";
import {localUserStore} from "./Connexion/LocalUserStore";
import {ErrorScene} from "./Phaser/Reconnecting/ErrorScene";

// Load Jitsi if the environment variable is set.
if (JITSI_URL) {
    const jitsiScript = document.createElement('script');
    jitsiScript.src = 'https://' + JITSI_URL + '/external_api.js';
    document.head.appendChild(jitsiScript);
}

const {width, height} = coWebsiteManager.getGameSize();

const valueGameQuality = localUserStore.getGameQualityValue();
const fps : Phaser.Types.Core.FPSConfig = {
    /**
     * The minimum acceptable rendering rate, in frames per second.
     */
    min: valueGameQuality,
    /**
     * The optimum rendering rate, in frames per second.
     */
    target: valueGameQuality,
    /**
     * Use setTimeout instead of requestAnimationFrame to run the game loop.
     */
    forceSetTimeOut: true,
    /**
     * Calculate the average frame delta from this many consecutive frame intervals.
     */
    deltaHistory: 120,
    /**
     * The amount of frames the time step counts before we trust the delta values again.
     */
    panicMax: 20,
    /**
     * Apply delta smoothing during the game update to help avoid spikes?
     */
    smoothStep: false
}

const config: GameConfig = {
    type: Phaser.AUTO,
    title: "WorkAdventure",
    width: width / RESOLUTION,
    height: height / RESOLUTION,
    parent: "game",
    scene: [EntryScene, LoginScene, SelectCharacterScene, EnableCameraScene, ReconnectingScene, ErrorScene, CustomizeScene, MenuScene],
    zoom: RESOLUTION,
    fps: fps,
    dom: {
        createContainer: true
    },
    physics: {
        default: "arcade",
        arcade: {
            debug: DEBUG_MODE,
        }
    },
    callbacks: {
        postBoot: game => {
            const renderer = game.renderer;
            if (renderer instanceof WebGLRenderer) {
                renderer.pipelines.add(OutlinePipeline.KEY, new OutlinePipeline(game));
            }
        }
    }
};

cypressAsserter.gameStarted();

const game = new Phaser.Game(config);

window.addEventListener('resize', function (event) {
    const {width, height} = coWebsiteManager.getGameSize();
    game.scale.resize(width / RESOLUTION, height / RESOLUTION);

    // Let's trigger the onResize method of any active scene that is a ResizableScene
    for (const scene of game.scene.getScenes(true)) {
        if (scene instanceof ResizableScene) {
            scene.onResize(event);
        }
    }
});

coWebsiteManager.onStateChange(() => {
    const {width, height} = coWebsiteManager.getGameSize();
    game.scale.resize(width / RESOLUTION, height / RESOLUTION);
});
