<script lang="ts">
    /* eslint no-undef: 0 */
    import { onDestroy, onMount } from "svelte";
    import * as Sentry from "@sentry/svelte";
    import WebFontLoaderPlugin from "phaser3-rex-plugins/plugins/webfontloader-plugin.js";
    import AwaitLoaderPlugin from "phaser3-rex-plugins/plugins/awaitloader-plugin.js";
    import OutlinePipelinePlugin from "phaser3-rex-plugins/plugins/outlinepipeline-plugin.js";
    import type { Unsubscriber } from "svelte/store";
    import { DEBUG_MODE, SENTRY_DSN_FRONT, SENTRY_ENVIRONMENT, SENTRY_RELEASE } from "../Enum/EnvironmentVariable";
    import { HdpiManager } from "../Phaser/Services/HdpiManager";
    import { EntryScene } from "../Phaser/Login/EntryScene";
    import { LoginScene } from "../Phaser/Login/LoginScene";
    import { SelectCharacterScene } from "../Phaser/Login/SelectCharacterScene";
    import { SelectCompanionScene } from "../Phaser/Login/SelectCompanionScene";
    import { EnableCameraScene } from "../Phaser/Login/EnableCameraScene";
    import { ReconnectingScene } from "../Phaser/Reconnecting/ReconnectingScene";
    import { ErrorScene } from "../Phaser/Reconnecting/ErrorScene";
    import { Game } from "../Phaser/Game/Game";
    import { waScaleManager } from "../Phaser/Services/WaScaleManager";
    import { HtmlUtils } from "../WebRtc/HtmlUtils";
    import { iframeListener } from "../Api/IframeListener";
    import { desktopApi } from "../Api/Desktop";
    import { canvasSize, coWebsiteManager, coWebsites, fullScreenCowebsite } from "../Stores/CoWebsiteStore";
    import { urlManager } from "../Url/UrlManager";
    import { FileListener } from "../Phaser/FileUpload/FileListener";
    import { isStructuredCloneSupported } from "../Utils/BrowserCompatibility";
    import { analyticsClient } from "../Administration/AnalyticsClient";
    import type { BeforeInstallPromptEvent } from "../../types/pwa-install";
    import GameOverlay from "./GameOverlay.svelte";
    import CoWebsitesContainer from "./EmbedScreens/CoWebsitesContainer.svelte";
    import BrowserNotSupported from "./BrowserNotSupported/BrowserNotSupported.svelte";
    import PwaInstallPrompt from "./PwaInstall/PwaInstallPrompt.svelte";

    let WebGLRenderer = Phaser.Renderer.WebGL.WebGLRenderer;
    let game: Game;
    let gameDiv: HTMLDivElement;
    let activeCowebsite = $coWebsites[0];
    let gameContainer: HTMLDivElement;
    let canvas: HTMLCanvasElement;
    let handleCanvasClick: () => void;
    let browserNotSupported = false;

    // PWA install prompt (logic inlined from PwaInstallGate)
    const PWA_PROMPT_SHOWN_KEY = "workadventure_pwa_install_prompt_shown";
    const WAIT_FOR_PROMPT_MS = 1500;
    let showPwaApp = false;
    let showPwaPrompt = false;
    let deferredPwaPrompt: BeforeInstallPromptEvent | null = null;
    let pwaIsIos = false;
    let pwaInstalling = false;
    let pwaWaitTimeout: ReturnType<typeof setTimeout> | undefined;

    function isStandalone(): boolean {
        if (typeof window === "undefined") return false;
        const nav = window.navigator as Navigator & { standalone?: boolean };
        return (
            window.matchMedia("(display-mode: standalone)").matches ||
            nav.standalone === true ||
            document.referrer.includes("android-app://")
        );
    }

    function hasPwaPromptAlreadyBeenShown(): boolean {
        try {
            return localStorage.getItem(PWA_PROMPT_SHOWN_KEY) === "1";
        } catch {
            return false;
        }
    }

    function markPwaPromptShown(): void {
        try {
            localStorage.setItem(PWA_PROMPT_SHOWN_KEY, "1");
        } catch {
            // ignore
        }
    }

    function detectIos(): boolean {
        if (typeof navigator === "undefined") return false;
        return (
            /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
        );
    }

    function goToPwaApp(): void {
        markPwaPromptShown();
        showPwaPrompt = false;
        showPwaApp = true;
    }

    function handlePwaSkip(): void {
        analyticsClient.pwaContinueInBrowserClick();
        goToPwaApp();
    }

    async function handlePwaInstall(): Promise<void> {
        if (!deferredPwaPrompt) return;
        analyticsClient.pwaInstallClick();
        pwaInstalling = true;
        try {
            await deferredPwaPrompt.prompt();
            const { outcome } = await deferredPwaPrompt.userChoice;
            analyticsClient.pwaInstallOutcome(outcome);
            if (outcome === "accepted") {
                window.__workadventureDeferredPwaPrompt = null;
            }
        } finally {
            pwaInstalling = false;
        }
        goToPwaApp();
    }

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
                    integrations: [Sentry.browserTracingIntegration()],
                    // Set tracesSampleRate to 1.0 to capture 100%
                    // of transactions for performance monitoring.
                    // We recommend adjusting this value in production
                    tracesSampleRate: 0.2,
                    attachStacktrace: true,
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

    onMount(() => {
        if (hasPwaPromptAlreadyBeenShown() || isStandalone()) {
            showPwaApp = true;
            return;
        }
        deferredPwaPrompt = window.__workadventureDeferredPwaPrompt ?? null;
        pwaIsIos = detectIos();

        const maybeShowPwaPrompt = () => {
            deferredPwaPrompt = window.__workadventureDeferredPwaPrompt ?? deferredPwaPrompt;
            const canInstall = Boolean(deferredPwaPrompt) || pwaIsIos;
            if (canInstall) {
                showPwaPrompt = true;
                analyticsClient.pwaInstallPromptShown(pwaIsIos);
            } else {
                showPwaApp = true;
            }
        };

        if (deferredPwaPrompt || pwaIsIos) {
            maybeShowPwaPrompt();
            return;
        }

        pwaWaitTimeout = setTimeout(maybeShowPwaPrompt, WAIT_FOR_PROMPT_MS);

        const onBeforeInstall = (e: Event) => {
            e.preventDefault();
            window.__workadventureDeferredPwaPrompt = e as BeforeInstallPromptEvent;
            deferredPwaPrompt = window.__workadventureDeferredPwaPrompt;
            if (pwaWaitTimeout) clearTimeout(pwaWaitTimeout);
            showPwaPrompt = true;
            analyticsClient.pwaInstallPromptShown(pwaIsIos);
        };
        window.addEventListener("beforeinstallprompt", onBeforeInstall);

        return () => {
            if (pwaWaitTimeout) clearTimeout(pwaWaitTimeout);
            window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        };
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
        if (canvas && handleCanvasClick) {
            canvas.removeEventListener("click", handleCanvasClick);
        }
    });
</script>

{#if browserNotSupported}
    <BrowserNotSupported />
{:else}
    <!-- Main content always in DOM so game can init; hidden until PWA gate allows -->
    <div class:pwa-gate-hidden={!showPwaApp} class="pwa-gate-main">
        <div
            class="h-dvh w-dvw flex landscape:flex-row portrait:flex-col-reverse"
            id="main-container"
            bind:this={gameContainer}
        >
            <div id="game" class="relative {$fullScreenCowebsite ? 'hidden' : ''}" bind:this={gameDiv}>
                <GameOverlay {game} />
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
    </div>
    {#if showPwaPrompt}
        <PwaInstallPrompt
            deferredPrompt={deferredPwaPrompt}
            isIos={pwaIsIos}
            onInstall={handlePwaInstall}
            onSkip={handlePwaSkip}
            installing={pwaInstalling}
        />
    {:else if !showPwaApp}
        <!-- Waiting for installability check: same background as body -->
        <div class="fixed inset-0 bg-[rgb(27,42,65)]" aria-hidden="true" />
    {/if}
{/if}

<style>
    .pwa-gate-main {
        width: 100%;
        height: 100%;
        min-height: 100dvh;
        min-width: 100dvw;
    }
    .pwa-gate-main.pwa-gate-hidden {
        visibility: hidden;
        pointer-events: none;
    }
</style>
