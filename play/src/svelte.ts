import * as Sentry from "@sentry/svelte";
import "phaser";
import "./front/style/index.scss";

import WebFontLoaderPlugin from "phaser3-rex-plugins/plugins/webfontloader-plugin.js";
import OutlinePipelinePlugin from "phaser3-rex-plugins/plugins/outlinepipeline-plugin.js";
import { DEBUG_MODE, SENTRY_DSN_FRONT, SENTRY_RELEASE, SENTRY_ENVIRONMENT } from "./front/Enum/EnvironmentVariable";
import { LoginScene } from "./front/Phaser/Login/LoginScene";
import { ReconnectingScene } from "./front/Phaser/Reconnecting/ReconnectingScene";
import { SelectCharacterScene } from "./front/Phaser/Login/SelectCharacterScene";
import { SelectCompanionScene } from "./front/Phaser/Login/SelectCompanionScene";
import { EnableCameraScene } from "./front/Phaser/Login/EnableCameraScene";
import { CustomizeScene } from "./front/Phaser/Login/CustomizeScene";
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
import { urlManager } from "./front/Url/UrlManager";
import WebGLRenderer = Phaser.Renderer.WebGL.WebGLRenderer;

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

// the ?phaserMode=canvas or #phaserMode=canvas parameter can be used to force Canvas usage
function getRendererMode(): string | undefined {
    const params = new URLSearchParams(document.location.search.substring(1));
    let phaserMode: string | null | undefined = params.get("phaserMode");

    if (phaserMode === null) {
        phaserMode = urlManager.getHashParameter("phaserMode");
    }

    return phaserMode;
}

let mode: number;
switch (getRendererMode()) {
    case "auto":
    case undefined:
        mode = Phaser.AUTO;
        break;
    case "canvas":
        mode = Phaser.CANVAS;
        break;
    case "webgl":
        mode = Phaser.WEBGL;
        break;
    case "headless":
        mode = Phaser.HEADLESS;
        break;
    default:
        throw new Error('phaserMode parameter must be one of "auto", "canvas", "webgl" or "headless"');
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
    disableContextMenu: true,
    render: {
        pixelArt: mode !== Phaser.HEADLESS, // There is a bug in Phaser 3.60.0 that makes headless mode crash when pixelArt is enabled
        roundPixels: true,
        antialias: mode === Phaser.HEADLESS, // There is a bug in Phaser 3.60.0 that makes headless mode crash when antialias is disabled
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

const app = new App({
    target: HtmlUtils.getElementByIdOrFail("game-overlay"),
    props: {
        game: game,
    },
});

export default app;
