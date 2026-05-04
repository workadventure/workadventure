<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import logoImg from "../images/logo.svg";
    import bgMap from "../images/map-exemple.png";
    import poweredByWorkAdventureImg from "../images/Powered_By_WorkAdventure_Big.png";
    import pwaDefaultBackground from "../images/pwa-background-image.jpg";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import {
        pwaInstallUiStore,
        initPwaInstallUiListeners,
        installPwaFromStore,
        continuePwaInBrowser,
        neverShowPwaPage,
    } from "../../Stores/PwaInstallStore";
    import { detectIos, markPwaPromptNeverShow } from "../../Utils/PwaInstallEligibility";
    import { IconApps, IconAppWindow, IconHistory } from "@wa-icons";

    let logo = logoImg;
    let sceneBg = bgMap;

    let neverShowAgain = false;
    let unsubscribePwa: (() => void) | undefined;

    onMount(() => {
        unsubscribePwa = initPwaInstallUiListeners();
        analyticsClient.pwaInstallPromptShown(detectIos());

        gameManager.currentStartedRoomPromise
            .then((room) => {
                if (room.loginSceneLogo) {
                    logo = room.loginSceneLogo;
                }
                if (room.backgroundSceneImage) {
                    sceneBg = room.backgroundSceneImage;
                }
            })
            .catch((e) => {
                console.error("Error while loading current room for PWA install screen", e);
            });
    });

    onDestroy(() => {
        unsubscribePwa?.();
    });

    function getBackgroundColor(): string | undefined {
        return gameManager.currentStartedRoom?.backgroundColor;
    }

    function handleContinue(): void {
        if (neverShowAgain) {
            neverShowPwaPage();
            return;
        }
        continuePwaInBrowser();
    }

    async function handleInstall(): Promise<void> {
        if (neverShowAgain) {
            markPwaPromptNeverShow();
        }
        await installPwaFromStore();
    }

    function toggleNeverShow(): void {
        neverShowAgain = !neverShowAgain;
    }
</script>

<div
    class="pwa-install-screen loginScene relative z-30 flex w-full h-full flex-col items-center justify-center overflow-y-auto pointer-events-auto font-[roboto]"
>
    <!-- Full-page background -->
    <div
        class="absolute inset-0 z-0 bg-cover bg-center h-full w-full"
        style="background-image: url('{sceneBg}');"
        aria-hidden="true"
    />
    <!-- Dim overlay (room tint or default blue) -->
    <div
        class="absolute inset-0 z-[1] backdrop-blur-[2px] h-full w-full"
        style={getBackgroundColor() != undefined
            ? `background-color: ${getBackgroundColor()}; opacity: 0.82;`
            : "background-color: rgb(15 28 48 / 0.82);"}
        aria-hidden="true"
    />

    <div
        class="relative z-10 mx-auto flex w-full max-w-[min(510px,calc(100vw-2rem))] flex-col items-center gap-6 px-4 py-10"
    >
        <div class="w-full overflow-hidden rounded-2xl bg-contrast text-left">
            <!-- Header: banner + logo + italic pitch -->
            <div class="hidden relative min-h-[200px] md:block">
                <div class="absolute inset-0 bg-cover bg-center" aria-hidden="true">
                    <img draggable="false" src={pwaDefaultBackground} alt="" class="h-full w-full object-cover" />
                </div>
                <div class="absolute inset-0 bg-black/40" aria-hidden="true" />
                <div
                    class="absolute flex flex-col justify-center content-center items-center gap-4 px-6 py-4 text-center w-full h-full"
                >
                    <img
                        draggable="false"
                        src={logo}
                        alt=""
                        class="h-auto w-[min(280px,75vw)] max-h-[72px] object-contain drop-shadow-md {gameManager
                            .currentStartedRoom.loginSceneLogo
                            ? 'max-h-[100px]'
                            : 'brightness-0 invert'}"
                    />
                    <p class="m-0 max-w-sm text-sm italic leading-snug text-white/90">
                        {#if $pwaInstallUiStore.isIos}
                            {$LL.warning.pwaInstall.descriptionIos()}
                        {:else}
                            {$LL.warning.pwaInstall.description()}
                        {/if}
                    </p>
                </div>
            </div>

            <div class="flex flex-col gap-6 px-6 py-6">
                <ul class="m-0 flex list-none flex-col gap-2 p-0 md:px-6">
                    <li class="flex gap-3">
                        <span
                            class="flex h-10 w-10 shrink-0 items-center justify-center rounded text-white/50"
                            aria-hidden="true"
                        >
                            <IconApps class="h-6 w-6" />
                        </span>
                        <div class="min-w-0">
                            <p class="m-0 text-sm font-bold text-white">{$LL.warning.pwaInstall.feature1Title()}</p>
                            <p class="m-0 text text-white">
                                {$LL.warning.pwaInstall.feature1Description()}
                            </p>
                        </div>
                    </li>
                    <li class="flex gap-3">
                        <span
                            class="flex h-10 w-10 shrink-0 items-center justify-center rounded text-white/50"
                            aria-hidden="true"
                        >
                            <IconAppWindow class="h-6 w-6" />
                        </span>
                        <div class="min-w-0">
                            <p class="m-0 text-sm font-bold text-white">{$LL.warning.pwaInstall.feature2Title()}</p>
                            <p class="m-0 text text-white">
                                {$LL.warning.pwaInstall.feature2Description()}
                            </p>
                        </div>
                    </li>
                    <li class="flex gap-3">
                        <span
                            class="flex h-10 w-10 shrink-0 items-center justify-center rounded text-white/50"
                            aria-hidden="true"
                        >
                            <IconHistory class="h-6 w-6" />
                        </span>
                        <div class="min-w-0">
                            <p class="m-0 text-sm font-bold text-white">{$LL.warning.pwaInstall.feature3Title()}</p>
                            <p class="m-0 text text-white">
                                {$LL.warning.pwaInstall.feature3Description()}
                            </p>
                        </div>
                    </li>
                </ul>

                {#if $pwaInstallUiStore.isIos}
                    <div class="rounded bg-white/5 p-4 text-sm text-white/95 ring-1 ring-white/10">
                        <p class="m-0 font-semibold">{$LL.warning.pwaInstall.iosStepsTitle()}</p>
                        <ol class="m-0 list-decimal space-y-1.5 pl-5">
                            <li>{$LL.warning.pwaInstall.iosStep1()}</li>
                            <li>{$LL.warning.pwaInstall.iosStep2()}</li>
                            <li>{$LL.warning.pwaInstall.iosStep3()}</li>
                        </ol>
                    </div>
                {/if}

                <div class="flex flex-col gap-4">
                    {#if $pwaInstallUiStore.deferredPrompt && !$pwaInstallUiStore.isIos}
                        <button
                            type="button"
                            class="btn btn-secondary !text-lg"
                            on:click={handleInstall}
                            disabled={$pwaInstallUiStore.installing}
                            data-testid="pwa-install-button"
                        >
                            <svg class="h-5 w-5 shrink-0 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                            </svg>
                            {$pwaInstallUiStore.installing
                                ? $LL.warning.pwaInstall.installing()
                                : $LL.warning.pwaInstall.install()}
                        </button>
                    {/if}

                    <button
                        type="button"
                        class="btn btn-light !bg-white/10 !text-lg !text-white hover:!bg-white/20"
                        on:click={() => {
                            analyticsClient.pwaContinueInBrowserClick();
                            handleContinue();
                        }}
                        data-testid="pwa-install-skip"
                    >
                        {$LL.warning.pwaInstall.continue()}
                    </button>

                    <div class="flex flex-col items-center gap-2">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={neverShowAgain}
                            class="flex cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-sm text-white/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded max-h-5"
                            on:click={toggleNeverShow}
                            data-testid="pwa-install-never-show-input"
                        >
                            <span
                                class="relative inline-flex h-5 w-8 shrink-0 rounded-full transition-colors {neverShowAgain
                                    ? 'bg-[#4b68ff]'
                                    : 'bg-white/25'}"
                            >
                                <span
                                    class="pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform {neverShowAgain
                                        ? 'translate-x-3'
                                        : 'translate-x-0'}"
                                />
                            </span>
                            <span class="text-lg">{$LL.warning.pwaInstall.neverShowPage()}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {#if logo !== logoImg && gameManager.currentStartedRoom.showPoweredBy !== false}
            <section class="flex justify-center pb-2">
                <img draggable="false" src={poweredByWorkAdventureImg} alt="Powered by WorkAdventure" class="h-14" />
            </section>
        {/if}
    </div>
</div>
