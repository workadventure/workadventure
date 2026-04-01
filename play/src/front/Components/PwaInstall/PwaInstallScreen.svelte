<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import logoImg from "../images/logo.svg";
    import bgMap from "../images/map-exemple.png";
    import poweredByWorkAdventureImg from "../images/Powered_By_WorkAdventure_Big.png";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import {
        pwaInstallUiStore,
        initPwaInstallUiListeners,
        installPwaFromStore,
        continuePwaInBrowser,
        neverShowPwaPage,
    } from "../../Stores/PwaInstallStore";
    import { detectIos } from "../../Utils/PwaInstallEligibility";

    const PWA_DEFAULT_BACKGROUND = "/resources/pwa/background-image.png";

    let logo = gameManager.currentStartedRoom.loginSceneLogo ?? logoImg;
    const sceneBg = gameManager.currentStartedRoom.backgroundSceneImage ?? bgMap;

    let neverShowAgain = false;
    let unsubscribePwa: (() => void) | undefined;

    onMount(() => {
        unsubscribePwa = initPwaInstallUiListeners();
        analyticsClient.pwaInstallPromptShown(detectIos());
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
                <div
                    class="absolute inset-0 bg-cover bg-[center_30%]"
                    style="background-image: url('{PWA_DEFAULT_BACKGROUND}');"
                    aria-hidden="true"
                />
                <div class="absolute inset-0 bg-black/40" aria-hidden="true" />
                <div class="relative flex flex-col items-center gap-3 px-6 pb-6 pt-8 text-center">
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
                            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01-.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
                                />
                            </svg>
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
                            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                />
                            </svg>
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
                            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                                />
                            </svg>
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
                            <svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        on:click={handleContinue}
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
