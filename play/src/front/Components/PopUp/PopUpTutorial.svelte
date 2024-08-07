<script lang="ts">
    import { bannerVisible, currentBannerIndex } from "../../Stores/PopupStore";
    import TutorialInstruction from "./TutorialInstruction.svelte";
</script>

{#if $currentBannerIndex === 0 && $bannerVisible}
    <TutorialInstruction>
        <div class="text-xs uppercase opacity-50">Go private !</div>
        <div class="text-lg">Enter silent zones when you need not to be disturbed !</div>
    </TutorialInstruction>
{/if}

{#if $currentBannerIndex === 1 && $bannerVisible}
    <TutorialInstruction>
        <div class="text-xs uppercase opacity-50">Interact with dynamic zones !</div>
        <div class="text-lg">Interact with dynamic zones by walking into them, a window will open!</div>
    </TutorialInstruction>
{/if}

{#if $currentBannerIndex === 2 && $bannerVisible}
    <TutorialInstruction>
        <div class="text-xs uppercase opacity-50">Attend a conference !</div>
        <div class="text-lg">Enter a conference room to connect with unlimited number of WOKAs.</div>
    </TutorialInstruction>
{/if}

{#if $currentBannerIndex === 3 && $bannerVisible}
    <TutorialInstruction>
        <div class="text-xs uppercase opacity-50">Chat with someone !</div>
        <div class="text-lg">Reduce the space and send messages to anyone!</div>
    </TutorialInstruction>
{/if}

{#if $currentBannerIndex === 4 && $bannerVisible}
    <TutorialInstruction>
        <div class="text-xs uppercase opacity-50">Use your keyboard to move and meet people!</div>
        <div class="text-lg">Use your keyboard to move and meet people!</div>
    </TutorialInstruction>
{/if}
