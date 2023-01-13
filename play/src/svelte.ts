import "phaser";
import "./front/style/index.scss";

import { DEBUG_MODE } from "./front/Enum/EnvironmentVariable";
import { LoginScene } from "./front/Phaser/Login/LoginScene";
import { ReconnectingScene } from "./front/Phaser/Reconnecting/ReconnectingScene";
import { SelectCharacterScene } from "./front/Phaser/Login/SelectCharacterScene";
import { SelectCompanionScene } from "./front/Phaser/Login/SelectCompanionScene";
import { EnableCameraScene } from "./front/Phaser/Login/EnableCameraScene";
import { CustomizeScene } from "./front/Phaser/Login/CustomizeScene";
import WebFontLoaderPlugin from "phaser3-rex-plugins/plugins/webfontloader-plugin.js";
import OutlinePipelinePlugin from "phaser3-rex-plugins/plugins/outlinepipeline-plugin.js";
import { EntryScene } from "./front/Phaser/Login/EntryScene";
import { coWebsiteManager } from "./front/WebRtc/CoWebsiteManager";
import { ErrorScene } from "./front/Phaser/Reconnecting/ErrorScene";
import { iframeListener } from "./front/Api/IframeListener";
import { desktopApi } from "./front/Api/Desktop";
import { HdpiManager } from "./front/Phaser/Services/HdpiManager";
import { waScaleManager } from "./front/Phaser/Services/WaScaleManager";
import { Game } from "./front/Phaser/Game/Game";
import App from "./front/Components/App.svelte";
import { HtmlUtils } from "./front/WebRtc/HtmlUtils";
import WebGLRenderer = Phaser.Renderer.WebGL.WebGLRenderer;

const { width, height } = coWebsiteManager.getGameSize();
const fps: Phaser.Types.Core.FPSConfig = {
    /**
     * The minimum acceptable rendering rate, in frames per second.
     */
    min: 60,
    /**
     * The optimum rendering rate, in frames per second.
     */
    target: 60,
    /**
     * Use setTimeout instead of requestAnimationFrame to run the game loop.
     */
    forceSetTimeOut: false,
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
    smoothStep: false,
};

// the ?phaserMode=canvas parameter can be used to force Canvas usage
const params = new URLSearchParams(document.location.search.substring(1));
const phaserMode = params.get("phaserMode");
let mode: number;
switch (phaserMode) {
    case "auto":
    case null:
        mode = Phaser.AUTO;
        break;
    case "canvas":
        mode = Phaser.CANVAS;
        break;
    case "webgl":
        mode = Phaser.WEBGL;
        break;
    default:
        throw new Error('phaserMode parameter must be one of "auto", "canvas" or "webgl"');
}

const hdpiManager = new HdpiManager(640 * 480, 196 * 196);
const { game: gameSize, real: realSize } = hdpiManager.getOptimalGameSize({ width, height });

const config: Phaser.Types.Core.GameConfig = {
    type: mode,
    title: "WorkAdventure",
    scale: {
        parent: "game",
        width: gameSize.width,
        height: gameSize.height,
        zoom: realSize.width / gameSize.width,
        autoRound: true,
        resizeInterval: 999999999999,
    },
    scene: [
        EntryScene,
        LoginScene,
        SelectCharacterScene,
        SelectCompanionScene,
        EnableCameraScene,
        ReconnectingScene,
        ErrorScene,
        CustomizeScene,
    ],
    //resolution: window.devicePixelRatio / 2,
    fps: fps,
    dom: {
        createContainer: true,
    },
    render: {
        pixelArt: true,
        roundPixels: true,
        antialias: false,
        antialiasGL: false,
    },
    plugins: {
        global: [
            {
                key: "rexWebFontLoader",
                plugin: WebFontLoaderPlugin,
                start: true,
            },
        ],
    },
    physics: {
        default: "arcade",
        arcade: {
            debug: DEBUG_MODE,
        },
    },
    // Instruct systems with 2 GPU to choose the low power one. We don't need that extra power and we want to save battery
    powerPreference: "low-power",
    callbacks: {
        postBoot: (game) => {
            // Install rexOutlinePipeline only if the renderer is WebGL.
            const renderer = game.renderer;
            if (renderer instanceof WebGLRenderer) {
                game.plugins.install("rexOutlinePipeline", OutlinePipelinePlugin, true);
            }
        },
    },
    backgroundColor: "#1b1b29",
};

const game = new Game(config);

waScaleManager.setGame(game);

/*
TODO: replace with disableContextMenu when Phaser does not disable context menu on document.body
see https://github.com/photonstorm/phaser/issues/6064
*/
HtmlUtils.querySelectorOrFail("#game canvas").addEventListener("contextmenu", function (e) {
    e.preventDefault();
});

window.addEventListener("resize", function () {
    coWebsiteManager.restoreMainSize();

    waScaleManager.applyNewSize();
    waScaleManager.refreshFocusOnTarget();
});

coWebsiteManager.onResize.subscribe(() => {
    waScaleManager.applyNewSize();
    waScaleManager.refreshFocusOnTarget();
});

iframeListener.init();
desktopApi.init();

const app = new App({
    target: HtmlUtils.getElementByIdOrFail("game-overlay"),
    props: {
        game: game,
    },
});

export default app;
