<script lang="ts">
    /* eslint no-undef: 0 */
    import { onDestroy, onMount } from "svelte";
    import { fly } from "svelte/transition";
    import * as Sentry from "@sentry/svelte";
    import WebFontLoaderPlugin from "phaser3-rex-plugins/plugins/webfontloader-plugin.js";
    import AwaitLoaderPlugin from "phaser3-rex-plugins/plugins/awaitloader-plugin.js";
    import OutlinePipelinePlugin from "phaser3-rex-plugins/plugins/outlinepipeline-plugin.js";
    import { Unsubscriber } from "svelte/store";
    import { DEBUG_MODE, SENTRY_DSN_FRONT, SENTRY_ENVIRONMENT, SENTRY_RELEASE } from "../Enum/EnvironmentVariable";
    import { HdpiManager } from "../Phaser/Services/HdpiManager";
    import { EntryScene } from "../Phaser/Login/EntryScene";
    import { LoginScene } from "../Phaser/Login/LoginScene";
    import { SelectCharacterScene } from "../Phaser/Login/SelectCharacterScene";
    import { SelectCompanionScene } from "../Phaser/Login/SelectCompanionScene";
    import { EnableCameraScene } from "../Phaser/Login/EnableCameraScene";
    import { ReconnectingScene } from "../Phaser/Reconnecting/ReconnectingScene";
    import { ErrorScene } from "../Phaser/Reconnecting/ErrorScene";
    import { CustomizeScene } from "../Phaser/Login/CustomizeScene";
    import { Game } from "../Phaser/Game/Game";
    import { waScaleManager } from "../Phaser/Services/WaScaleManager";
    import { HtmlUtils } from "../WebRtc/HtmlUtils";
    import { iframeListener } from "../Api/IframeListener";
    import { desktopApi } from "../Api/Desktop";
    import {
        canvasSize,
        coWebsiteManager,
        coWebsites,
        coWebsitesSize,
        fullScreenCowebsite,
    } from "../Stores/CoWebsiteStore";
    import { mouseInCameraTriggerArea } from "../Stores/MediaStore";
    import { screenOrientationStore } from "../Stores/ScreenOrientationStore";
    import GameOverlay from "./GameOverlay.svelte";
    import CoWebsitesContainer from "./EmbedScreens/CoWebsitesContainer.svelte";

    let WebGLRenderer = Phaser.Renderer.WebGL.WebGLRenderer;
    let game: Game;
    let gameDiv: HTMLDivElement;
    let activeCowebsite = $coWebsites[0];
    let gameContainer: HTMLDivElement;

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
        console.log("SIZE INFO :");
        console.log("width");
        console.log(width);
        console.log("height");
        console.log(height);
        console.log("gameDiv");
        console.log(gameDiv);
        console.log("gameSize.width");
        console.log(gameSize.width);
        console.log("gameSize.height");
        console.log(gameSize.height);

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
                pixelArt: false,
                roundPixels: false,
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
                    {
                        key: "rexAwaitLoader",
                        plugin: AwaitLoaderPlugin,
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
            backgroundColor: "#1b2a41",
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

        //updateScreenSize();
        iframeListener.init();
        desktopApi.init();
    });

    $: if ($coWebsites.length > 0) {
        activeCowebsite = $coWebsites[0];
    }

    function closeCoWebsiteFullScreen() {
        gameContainer.classList.remove("hidden");
        coWebsites.remove(activeCowebsite);
    }

    $: if ($fullScreenCowebsite && $coWebsites.length < 1) {
        closeCoWebsiteFullScreen();
    }

    //$: $coWebsites.length < 1 ? (flexBasis = undefined) : null;

    let canvasSizeUnsubscriber: Unsubscriber;
    onMount(() => {
        document.addEventListener("mousemove", detectInCameraArea);
        canvasSizeUnsubscriber = canvasSize.subscribe(({ width, height }) => {
            if (width < 1 || height < 1) {
                return;
            }
            waScaleManager.applyNewSize();
            waScaleManager.refreshFocusOnTarget();
        });
    });

    onDestroy(() => {
        document.removeEventListener("mousemove", detectInCameraArea);
        canvasSizeUnsubscriber?.();
    });

    let lastInTriggerArea = false;
    // We are tracking if the mouse cursor gets near the camera trigger area
    const detectInCameraArea = (event: MouseEvent) => {
        // Note: in phone mode, the camera is at the bottom. But we don't need to track that because in phone mode,
        // you cannot "hover" over the area where the camera is.
        const rect = gameDiv.getBoundingClientRect();

        const inTopCenter =
            event.x - rect.left > rect.width / 4 &&
            event.x + rect.left < (rect.width * 3) / 4 &&
            event.y - rect.top < rect.height / 4;
        if (inTopCenter !== lastInTriggerArea) {
            lastInTriggerArea = inTopCenter;
            mouseInCameraTriggerArea.set(inTopCenter);
        }
    };
</script>

<div
    class="h-screen w-screen flex landscape:flex-row portrait:flex-col-reverse fixed"
    id="main-container"
    bind:this={gameContainer}
>
    <div id="game" class="relative {$fullScreenCowebsite ? 'hidden' : ''}" bind:this={gameDiv}>
        <GameOverlay {game} />
    </div>
    {#if $coWebsites.length > 0}
        <div
            class="flex-1"
            transition:fly={{
                duration: 200,
                x:
                    $screenOrientationStore === "portrait"
                        ? 0
                        : document.documentElement.dir === "rtl"
                        ? -$coWebsitesSize.width
                        : $coWebsitesSize.width,
                y: $screenOrientationStore === "portrait" ? -$coWebsitesSize.height : 0,
            }}
        >
            <CoWebsitesContainer />
        </div>
    {/if}
</div>
