<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import LL from "../../../i18n/i18n-svelte";
    import PopUpContainer from "./PopUpContainer.svelte";
    import { popupStore } from "../../Stores/PopupStore";
    import { backgroundConfigStore, backgroundPresets } from "../../Stores/BackgroundTransformStore";
    import { cameraNoEnergySavingStore, localStreamStore } from "../../Stores/MediaStore";
    import RangeSlider from "../Input/RangeSlider.svelte";

    let selectedBlurAmount = 15;
    let previewVideoElement: HTMLVideoElement;

    onMount(() => {
        console.log("PopUpBackgroundCamera mounted");
        cameraNoEnergySavingStore.set(true);
    });
    onDestroy(() => {
        console.log("PopUpBackgroundCamera destroyed");
        cameraNoEnergySavingStore.set(false);
    });

    // Attach stream to preview video
    $: if (previewVideoElement && $localStreamStore.type === "success" && $localStreamStore.stream) {
        previewVideoElement.srcObject = $localStreamStore.stream;
    }

    function removePopup() {
        popupStore.removePopup("backgroundCamera");
    }

    function setBackgroundBlur(amount: number) {
        selectedBlurAmount = amount;
        backgroundConfigStore.setMode("blur");
        backgroundConfigStore.setBlurAmount(amount);
    }

    function setBackgroundImage(imageUrl: string) {
        backgroundConfigStore.setBackgroundImage(imageUrl);
        console.log(`🖼️ Background image set to ${imageUrl}`);
    }

    function setBackgroundVideo(videoUrl: string) {
        backgroundConfigStore.setBackgroundVideo(videoUrl);
        console.log(`🎬 Background video set to ${videoUrl}`);
    }

    function resetBackground() {
        backgroundConfigStore.reset();
    }

    function closePopup() {
        removePopup();
    }
</script>

<PopUpContainer reduceOnSmallScreen={true}>
    <!-- Structure avec Tailwind CSS : Aperçu en haut + Contrôles scrollables en bas -->
    <div class="flex flex-col max-h-[600px] w-full max-w-md min-w-[350px] mx-auto">
        <!-- Header avec titre -->
        <div class="flex-shrink-0 text-center p-4 border-b border-gray-200">
            <h3 class="text-xl font-bold text-white mb-2">🎬 {$LL.actionbar.camera.setBackground()}</h3>
            <!-- <p class="text-sm text-gray-600">{message}</p> -->
        </div>

        <!-- Aperçu vidéo en haut (fixe) -->
        <div class="flex-shrink-0 p-4 flex justify-center items-center">
            <div class="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
                <video
                    bind:this={previewVideoElement}
                    autoplay
                    muted
                    playsinline
                    class="w-full h-full object-cover transform scale-x-[-1]"
                />

                <!-- Overlay avec statut actuel -->
                <div
                    class="absolute top-3 left-3 px-3 py-1 bg-black bg-opacity-70 text-white text-sm rounded-full backdrop-blur-sm"
                >
                    {#if $backgroundConfigStore.mode === "blur"}
                        🌫️ Blur {$backgroundConfigStore.blurAmount}px
                    {:else if $backgroundConfigStore.mode === "image"}
                        🖼️ Custom Image
                    {:else if $backgroundConfigStore.mode === "video"}
                        🎬 Custom Video
                    {:else}
                        📹 No Effect
                    {/if}
                </div>

                <!-- Indicateur si pas de stream -->
                {#if $localStreamStore.type === "error"}
                    <div class="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
                        <div class="text-center">
                            <div class="text-2xl mb-2">❌</div>
                            <div class="text-sm">Camera Error</div>
                        </div>
                    </div>
                {:else if $localStreamStore.type !== "success"}
                    <div class="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
                        <div class="text-center">
                            <div class="text-2xl mb-2">📷</div>
                            <div class="text-sm">Loading Camera...</div>
                        </div>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Zone scrollable avec les contrôles -->
        <div class="flex-1 overflow-y-auto">
            <div class="p-4 space-y-6">
                <!-- Effets de flou -->
                <!-- Blur Effects section with a slider control -->
                <div>
                    <h4 class="text-lg font-semibold text-white mb-3 flex items-center">
                        🌫️ {$LL.actionbar.camera.blurEffects()}
                    </h4>
                    <div class="flex flex-col gap-3">
                        <RangeSlider
                            label="Blur Amount"
                            min={0}
                            max={50}
                            step={10}
                            value={$backgroundConfigStore.mode === "blur" ? $backgroundConfigStore.blurAmount : 0}
                            unit="px"
                            variant="secondary"
                            onChange={(v) => setBackgroundBlur(v)}
                        />
                    </div>
                </div>

                <!-- Arrière-plans d'images -->
                <div>
                    <h4 class="text-lg font-semibold text-white mb-3 flex items-center">
                        🖼️ Background Images
                    </h4>
                    <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {#each backgroundPresets.images as preset}
                            <button 
                                class="group relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                class:border-blue-500={$backgroundConfigStore.mode === 'image' && $backgroundConfigStore.backgroundImage === preset.url}
                                class:ring-2={$backgroundConfigStore.mode === 'image' && $backgroundConfigStore.backgroundImage === preset.url}
                                class:ring-blue-500={$backgroundConfigStore.mode === 'image' && $backgroundConfigStore.backgroundImage === preset.url}
                                on:click={() => setBackgroundImage(preset.url)}
                                title={preset.name}
                            >
                                <img 
                                    src={preset.url} 
                                    alt={preset.name} 
                                    class="w-full h-full object-cover"
                                />
                                <div class="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span class="text-white text-xs font-medium text-center px-1">{preset.name}</span>
                                </div>
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Arrière-plans vidéo -->
                <div>
                    <h4 class="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                        🎬 Background Videos
                    </h4>
                    <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {#each backgroundPresets.videos as preset}
                            <button 
                                class="group relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                class:border-blue-500={$backgroundConfigStore.mode === 'video' && $backgroundConfigStore.backgroundVideo === preset.url}
                                class:ring-2={$backgroundConfigStore.mode === 'video' && $backgroundConfigStore.backgroundVideo === preset.url}
                                class:ring-blue-500={$backgroundConfigStore.mode === 'video' && $backgroundConfigStore.backgroundVideo === preset.url}
                                on:click={() => setBackgroundVideo(preset.url)}
                                title={preset.name}
                            >
                                <video 
                                    src={preset.url} 
                                    class="w-full h-full object-cover" 
                                    muted 
                                    preload="metadata"
                                />
                                <div class="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span class="text-white text-xs font-medium text-center px-1">{preset.name}</span>
                                </div>
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Bouton Reset -->
                <div class="pt-4 border-t border-gray-200">
                    <button
                        class="w-full px-4 py-3 bg-red-50 hover:bg-red-100 border-2 border-red-200 hover:border-red-300 text-red-700 font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
                        on:click={resetBackground}
                    >
                        🚫 {$LL.actionbar.camera.disableBackgroundEffects()}
                    </button>
                </div>
            </div>
        </div>
    </div>

    <svelte:fragment slot="buttons">
        <button class="btn  btn-secondary btn-sm w-full max-w-96 justify-center" on:click={closePopup}>
            {$LL.actionbar.camera.close()}
        </button>
    </svelte:fragment>
</PopUpContainer>
