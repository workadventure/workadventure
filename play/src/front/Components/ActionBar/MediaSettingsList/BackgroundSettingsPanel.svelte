<script lang="ts">
    import { localStreamStore } from "../../../Stores/MediaStore";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { backgroundConfigStore, backgroundPresets } from "../../../Stores/BackgroundTransformStore";
    import type { BackgroundMode } from "../../../WebRtc/BackgroundProcessor/createBackgroundTransformer";
    import { srcObject } from "../../Video/utils";
    import SectionDivider from "./SectionDivider.svelte";
    import SectionTitle from "./SectionTitle.svelte";
    import BackgroundPresetButton from "./BackgroundPresetButton.svelte";
    import SelectionCheckOverlay from "./SelectionCheckOverlay.svelte";
    import { IconCamera, IconCheck, IconCancel } from "@wa-icons";

    const blurOptions = [
        { labelKey: "blurSmall" as const, amount: 10, blurTailwind: "blur-[2px]" },
        { labelKey: "blurMiddle" as const, amount: 25, blurTailwind: "blur-[6px]" },
        { labelKey: "blurHigh" as const, amount: 50, blurTailwind: "blur-[12px]" },
    ];

    function setBackgroundMode(newMode: BackgroundMode) {
        backgroundConfigStore.setMode(newMode);
    }

    function setBackgroundBlur(amount: number) {
        backgroundConfigStore.setMode("blur");
        backgroundConfigStore.setBlurAmount(amount);
    }

    function setBackgroundImage(imageUrl: string) {
        backgroundConfigStore.setBackgroundImage(imageUrl);
    }

    function setBackgroundVideo(videoUrl: string) {
        backgroundConfigStore.setBackgroundVideo(videoUrl);
    }

    $: isNoEffectSelected = $backgroundConfigStore.mode === "none";
</script>

<!-- Camera Preview -->
<div class="relative w-full aspect-video rounded-lg overflow-hidden bg-contrast/50 px-0">
    {#if $localStreamStore.type === "success" && $localStreamStore.stream}
        <video
            class="w-full h-full object-cover scale-x-[-1]"
            use:srcObject={$localStreamStore.stream}
            autoplay
            muted
            playsinline
        />
    {:else}
        <div class="w-full h-full flex items-center justify-center text-white/50">
            <IconCamera font-size="32" />
        </div>
    {/if}
</div>

<SectionDivider />

<!-- No Effect Button -->
<button class="relative z-10 flex flex-col gap-1 group text-left" on:click={() => setBackgroundMode("none")}>
    <div
        class="relative w-1/3 h-full aspect-square rounded-lg bg-white/10 flex flex-col items-center justify-center transition-all gap-1 {isNoEffectSelected
            ? 'border-2 border-white border-solid'
            : 'border-2 border-transparent hover:border-white/30'}"
    >
        {#if isNoEffectSelected}
            <IconCheck font-size="16" />
        {:else}
            <IconCancel font-size="16" />
        {/if}
        <span class="text-xs group-hover:text-white transition-colors">{$LL.actionbar.background.noEffect()}</span>
    </div>
</button>

<!-- Blur Section -->
<div class="relative z-10 flex flex-col gap-2 px-1">
    <SectionTitle title={$LL.actionbar.background.blur()} />
    <div class="grid grid-cols-3 gap-1">
        {#each blurOptions as option (option.amount)}
            {@const isSelected =
                $backgroundConfigStore.mode === "blur" && $backgroundConfigStore.blurAmount === option.amount}
            <button class="flex flex-col items-center group px-0" on:click={() => setBackgroundBlur(option.amount)}>
                <div class="relative w-full aspect-square rounded-sm border-2 transition-all">
                    <div
                        class="absolute inset-0 rounded-md overflow-hidden {isSelected
                            ? 'border-white border-solid border-2'
                            : 'border-transparent hover:border-white/30'}"
                    >
                        <img
                            src="/static/images/background/thumbnail/settingBackgroundEffect.jpeg"
                            alt="Blur preview"
                            class="w-full h-full object-cover {option.blurTailwind}"
                        />
                    </div>
                    {#if isSelected}
                        <SelectionCheckOverlay />
                    {/if}
                </div>
                <span
                    class="text-xs group-hover:text-white transition-colors {isSelected
                        ? 'text-white'
                        : 'text-white/70'}">{$LL.actionbar.background[option.labelKey]()}</span
                >
            </button>
        {/each}
    </div>
</div>

<!-- Images Section -->
<div class="relative z-10 flex flex-col gap-2">
    <SectionTitle title={$LL.actionbar.background.images()} />
    <div class="grid grid-cols-3 gap-1 px-1">
        {#each backgroundPresets.images as preset (preset.url)}
            <BackgroundPresetButton
                thumbnail={preset.thumbnail}
                name={preset.name}
                isSelected={$backgroundConfigStore.mode === "image" &&
                    $backgroundConfigStore.backgroundImage === preset.url}
                onClick={() => setBackgroundImage(preset.url)}
            />
        {/each}
    </div>
</div>

<!-- Videos Section -->
<div class="relative z-10 flex flex-col gap-2">
    <SectionTitle title={$LL.actionbar.background.videos()} />
    <div class="grid grid-cols-3 gap-1 px-1">
        {#each backgroundPresets.videos as preset (preset.url)}
            <BackgroundPresetButton
                thumbnail={preset.thumbnail}
                name={preset.name}
                isSelected={$backgroundConfigStore.mode === "video" &&
                    $backgroundConfigStore.backgroundVideo === preset.url}
                onClick={() => setBackgroundVideo(preset.url)}
            />
        {/each}
    </div>
</div>
