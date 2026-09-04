<script lang="ts">
    /* eslint no-undef: 0 */
    import { onDestroy, onMount } from "svelte";
    import * as Sentry from "@sentry/svelte";
    import * as Phaser from "phaser";
    import "phaser4-rex-plugins/plugins/awaitloader.js";
    import AwaitLoaderPlugin from "phaser4-rex-plugins/plugins/awaitloader-plugin.js";
    import OutlineFilterPlugin from "phaser4-rex-plugins/plugins/outlinefilter-plugin.js";
    import type { Unsubscriber } from "svelte/store";
    import {
        DEBUG_MODE,
        SENTRY_DSN_FRONT,
        SENTRY_ENVIRONMENT,
        SENTRY_RELEASE,
        SENTRY_TRACES_SAMPLE_RATE,
    } from "../Enum/EnvironmentVariable";
    import { HdpiManager } from "../Phaser/Services/HdpiManager";
    import { EntryScene } from "../Phaser/Login/EntryScene";
    import { LoginScene } from "../Phaser/Login/LoginScene";
    import { SelectCharacterScene } from "../Phaser/Login/SelectCharacterScene";
    import { SelectCompanionScene } from "../Phaser/Login/SelectCompanionScene";
    import { EnableCameraScene } from "../Phaser/Login/EnableCameraScene";
    import { PwaInstallScene } from "../Phaser/Login/PwaInstallScene";
    import { ReconnectingScene } from "../Phaser/Reconnecting/ReconnectingScene";
    import { ErrorScene } from "../Phaser/Reconnecting/ErrorScene";
    import { Game } from "../Phaser/Game/Game";
    import { pumpBootWhileFramesAreMissing } from "../Phaser/Game/BackgroundBoot";
    import { waScaleManager } from "../Phaser/Services/WaScaleManager";
    import { HtmlUtils } from "../WebRtc/HtmlUtils";
    import { iframeListener } from "../Api/IframeListener";
    import { connectionManager } from "../Connection/ConnectionManager";
    import { prefetchWamFile } from "../Connection/MapPrefetch";
    import { desktopApi } from "../Api/Desktop";
    import { canvasSize, coWebsiteManager, coWebsites, fullScreenCowebsite } from "../Stores/CoWebsiteStore";
    import { urlManager } from "../Url/UrlManager";
    import { FileListener } from "../Phaser/FileUpload/FileListener";
    import { isStructuredCloneSupported } from "../Utils/BrowserCompatibility";
    import { gameSceneIsLoadedStore } from "../Stores/GameSceneStore";
    import GameOverlay from "./GameOverlay.svelte";
    import CoWebsitesContainer from "./EmbedScreens/CoWebsitesContainer.svelte";
    import BrowserNotSupported from "./BrowserNotSupported/BrowserNotSupported.svelte";

    let WebGLRenderer = Phaser.Renderer.WebGL.WebGLRenderer;
    let game: Game | undefined = $state();
    let gameDiv: HTMLDivElement | undefined = $state();
    let activeCowebsite = $state($coWebsites[0]);
    let gameContainer: HTMLDivElement | undefined = $state();
    let canvas: HTMLCanvasElement;
    let handleCanvasClick: () => void;
    let browserNotSupported = $state(false);

    onMount(() => {
        // Check browser compatibility before initializing the app
        if (!isStructuredCloneSupported()) {
            browserNotSupported = true;
            return;
        }
        if (SENTRY_DSN_FRONT != undefined) {
            try {
                const sentryOptions: Sentry.BrowserOptions = {
                    dsn: SENTRY_DSN_FRONT,
                    release: SENTRY_RELEASE,
                    environment: SENTRY_ENVIRONMENT,
                    // Keep Sentry's default `browserApiErrors` integration but disable its
                    // requestAnimationFrame wrapping: it re-wraps the rAF callback on every frame,
                    // a measurable steady-state main-thread cost in a real-time/game app that runs
                    // a rAF loop continuously. The other wrapped APIs (setTimeout/setInterval/
                    // addEventListener/XHR) fire far less often and keep their instrumentation.
                    integrations: (defaultIntegrations) =>
                        defaultIntegrations
                            .filter((integration) => integration.name !== "BrowserApiErrors")
                            .concat(
                                Sentry.browserApiErrorsIntegration({ requestAnimationFrame: false }),
                                Sentry.browserTracingIntegration(),
                            ),
                    // Sample rate for performance tracing; configurable via env (default 0.2).
                    // Set to 1.0 to capture 100% of transactions.
                    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE ?? 0.2,
                    attachStacktrace: true,
                };

                Sentry.init(sentryOptions);
                console.info("Sentry initialized");
            } catch (e) {
                console.error("Error while initializing Sentry", e);
            }
        }

        // Resolve the room and authenticate now, in parallel with everything below. This is HTTP,
        // the URL and localUserStore — no Phaser — but it used to run from EntryScene.create(),
        // which means it only started once Phaser had booted and EntryScene had downloaded its own
        // assets. Started here it overlaps them, and GameManager.init() awaits a request that is
        // usually already in flight. The result is memoized, so awaiting it there is not a second
        // request.
        //
        // The catch is deliberately empty: the failure is handled where the result is consumed
        // (GameManager.init -> errorScreenStore). This only keeps the kick-off from surfacing as an
        // unhandled rejection when nothing has awaited it yet.
        connectionManager.startGameConnexion().catch(() => {
            // handled by the awaiting caller
        });

        // Chained on the room above: the WAM's URL comes from the /room response, and the file is a
        // plain axios GET that Phaser's loader only sequences. Starting it here means GameScene
        // usually finds it already downloaded instead of opening the request itself.
        prefetchWamFile();

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
        let phaserMode: string | null | undefined = params.get("phaserMode");

        if (phaserMode === null) {
            phaserMode = urlManager.getHashParameter("phaserMode");
        }

        let mode: number;
        switch (phaserMode) {
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

        if (!gameDiv) {
            return;
        }

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
                PwaInstallScene,
                ReconnectingScene,
                ErrorScene,
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
                    // Install rexOutlineFilter only if the renderer is WebGL.
                    const renderer = game.renderer;
                    if (renderer instanceof WebGLRenderer) {
                        game.plugins.install("rexOutlineFilter", OutlineFilterPlugin, true);
                    }
                },
            },
            backgroundColor: "#1b2a41",
        };

        game = new Game(config);

        // Everything left of the boot — switching to GameScene, reaching connect(), joining the
        // room — is dispatched by a loop that runs on requestAnimationFrame, which a hidden
        // renderer never gets. Take that loop over until the world is reached, so a window that
        // starts in the background joins its room instead of freezing on the loading screen.
        stopBootPump = pumpBootWhileFramesAreMissing(game.loop);
        bootPumpUnsubscriber = gameSceneIsLoadedStore.subscribe((isLoaded) => {
            if (isLoaded) {
                stopBootPump?.();
                bootPumpUnsubscriber?.();
            }
        });

        waScaleManager.setGame(game);

        canvas = HtmlUtils.querySelectorOrFail<HTMLCanvasElement>("#game canvas");

        handleCanvasClick = function () {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        };

        if (canvas) {
            canvas.addEventListener("click", handleCanvasClick);

            const fileListener = new FileListener(canvas);
            fileListener.initDomListeners();
        }

        //updateScreenSize();
        iframeListener.init();
        desktopApi.init();
    });

    $effect(() => {
        if ($coWebsites.length > 0) {
            activeCowebsite = $coWebsites[0];
        }
    });

    function closeCoWebsiteFullScreen() {
        gameContainer?.classList.remove("hidden");
        coWebsites.remove(activeCowebsite);
    }

    $effect(() => {
        if ($fullScreenCowebsite && $coWebsites.length < 1) {
            closeCoWebsiteFullScreen();
        }
    });

    //$: $coWebsites.length < 1 ? (flexBasis = undefined) : null;

    let canvasSizeUnsubscriber: Unsubscriber;
    let bootPumpUnsubscriber: Unsubscriber | undefined;
    let stopBootPump: (() => void) | undefined;
    onMount(() => {
        canvasSizeUnsubscriber = canvasSize.subscribe(({ width, height }) => {
            if (width < 1 || height < 1) {
                return;
            }
            waScaleManager.applyNewSize();
            waScaleManager.refreshFocusOnTarget();
        });
    });

    onDestroy(() => {
        canvasSizeUnsubscriber?.();
        bootPumpUnsubscriber?.();
        stopBootPump?.();
        if (canvas && handleCanvasClick) {
            canvas.removeEventListener("click", handleCanvasClick);
        }
    });
</script>

{#if browserNotSupported}
    <BrowserNotSupported />
{:else}
    <div
        class="h-dvh w-dvw flex landscape:flex-row portrait:flex-col-reverse"
        id="main-container"
        bind:this={gameContainer}
    >
        <div
            id="game"
            class="relative {$fullScreenCowebsite ? 'hidden' : ''}"
            class:game-scene-loaded={$gameSceneIsLoadedStore}
            bind:this={gameDiv}
        >
            {#if game}
                <GameOverlay {game} />
            {/if}
        </div>
        {#if $coWebsites.length > 0}
            <div class="flex-1">
                <!-- Transitions are breaking the onDestroy lifecycle of cowebsites -->
                <!--            transition:fly={{-->
                <!--            duration: 200,-->
                <!--            x:-->
                <!--                $screenOrientationStore === "portrait"-->
                <!--                    ? 0-->
                <!--                    : document.documentElement.dir === "rtl"-->
                <!--                        ? -$coWebsitesSize.width-->
                <!--                        : $coWebsitesSize.width,-->
                <!--            y: $screenOrientationStore === "portrait" ? -$coWebsitesSize.height : 0,-->
                <!--        }}-->
                <CoWebsitesContainer />
            </div>
        {/if}
    </div>
{/if}
