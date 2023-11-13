<script lang="ts">
import GameOverlay from "./GameOverlay.svelte";
import {onMount} from "svelte";
import {DEBUG_MODE, SENTRY_DSN_FRONT, SENTRY_ENVIRONMENT, SENTRY_RELEASE} from "../Enum/EnvironmentVariable";
import * as Sentry from "@sentry/svelte";
import {coWebsiteManager} from "../WebRtc/CoWebsiteManager";
import {HdpiManager} from "../Phaser/Services/HdpiManager";
import {EntryScene} from "../Phaser/Login/EntryScene";
import {LoginScene} from "../Phaser/Login/LoginScene";
import {SelectCharacterScene} from "../Phaser/Login/SelectCharacterScene";
import {SelectCompanionScene} from "../Phaser/Login/SelectCompanionScene";
import {EnableCameraScene} from "../Phaser/Login/EnableCameraScene";
import {ReconnectingScene} from "../Phaser/Reconnecting/ReconnectingScene";
import {ErrorScene} from "../Phaser/Reconnecting/ErrorScene";
import {CustomizeScene} from "../Phaser/Login/CustomizeScene";
import WebFontLoaderPlugin from "phaser3-rex-plugins/plugins/webfontloader-plugin.js";
import OutlinePipelinePlugin from "phaser3-rex-plugins/plugins/outlinepipeline-plugin.js";
import {Game} from "../Phaser/Game/Game";
import {waScaleManager} from "../Phaser/Services/WaScaleManager";
import {HtmlUtils} from "../WebRtc/HtmlUtils";
import {iframeListener} from "../Api/IframeListener";
import {desktopApi} from "../Api/Desktop";
import { fly, fade } from "svelte/transition";

import WebGLRenderer = Phaser.Renderer.WebGL.WebGLRenderer;

let game: Game;
let gameDiv: HTMLDivElement;

onMount(() => {
    if (SENTRY_DSN_FRONT != undefined) {
        try {
            const sentryOptions: Sentry.BrowserOptions = {
                dsn: SENTRY_DSN_FRONT,
                release: SENTRY_RELEASE,
                environment: SENTRY_ENVIRONMENT,
                integrations: [new Sentry.BrowserTracing()],
                // Set tracesSampleRate to 1.0 to capture 100%
                // of transactions for performance monitoring.
                // We recommend adjusting this value in production
                tracesSampleRate: 0.2,
            };

            Sentry.init(sentryOptions);
            console.info("Sentry initialized");
        } catch (e) {
            console.error("Error while initializing Sentry", e);
        }
    }

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
            parent: gameDiv,
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
        disableContextMenu: true,
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

    game = new Game(config);

    waScaleManager.setGame(game);

    const canvas = HtmlUtils.querySelectorOrFail<HTMLCanvasElement>("#game canvas");

    if (canvas) {
        canvas.addEventListener("click", function () {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        });
    }

    window.addEventListener("resize", function () {
        coWebsiteManager.restoreMainSize();

        waScaleManager.applyNewSize();
        waScaleManager.refreshFocusOnTarget();
    });

    // coWebsiteManager.onResize is a singleton. No need to unsubscribe.
    //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
    coWebsiteManager.onResize.subscribe(() => {
        waScaleManager.applyNewSize();
        waScaleManager.refreshFocusOnTarget();
    });

    iframeListener.init();
    desktopApi.init();
});

</script>

<div class="bg-contrast h-screen w-screen absolute z-[2]"></div>
<div class="main-container" id="main-container" style="position: relative;z-index: 10;">
    <!-- Create the editor container -->
    <GameOverlay {game} ></GameOverlay>
    <div id="game"
         bind:this={gameDiv}
         transition:fade={{ delay:1000, duration: 4000 }}
         class="absolute top-0 -z-10"
    >
    </div>
    <div id="cowebsite">
        <aside id="cowebsite-aside" class="noselect">
            <div id="cowebsite-aside-buttons">
                <button type="button" id="cowebsite-close" class="close-window top-right-btn">&times;</button>
                <button
                        class="top-right-btn btn bg-medium-purple"
                        id="cowebsite-fullscreen"
                        alt="fullscreen mode"
                >
                    <img
                            id="cowebsite-fullscreen-close"
                            style="display: none"
                            src="resources/logos/fullscreen-exit.svg"
                    />
                    <img id="cowebsite-fullscreen-open" src="resources/logos/fullscreen.svg" />
                </button>
                <button
                        class="top-right-btn btn bg-medium-purple"
                        id="cowebsite-swipe"
                        alt="swipe cowebsites"
                >
                    <img src="resources/logos/cowebsite-swipe.svg" />
                </button>
            </div>
            <div id="cowebsite-aside-holder">
                <div class="h-full w-1 bg-white rounded-lg"></div>
            </div>
            <aside id="cowebsite-other-actions"></aside>
        </aside>
        <main id="cowebsite-slot-main">
            <img id="cowebsite-loader" src="./static/images/Workadventure-loop.gif" style="width: 300px;">
        </main>
    </div>
    <div id="cowebsite-buffer"></div>
</div>