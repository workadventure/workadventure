<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { fade } from "svelte/transition";
    import type { OnboardingStep } from "../../Stores/OnboardingStore";

    export let currentStep: OnboardingStep;

    const dispatch = createEventDispatcher<{
        next: void;
        skip: void;
    }>();

    function handleNext() {
        dispatch("next");
    }

    function handleSkip() {
        dispatch("skip");
    }
</script>

<div
    class="fixed inset-0 z-[3000] pointer-events-none"
    transition:fade={{ duration: 300 }}
>
    <!-- Content slot -->
    <div class="relative z-10 pointer-events-none">
        <slot />
    </div>

    <!-- Skip button -->
    {#if currentStep !== "welcome" && currentStep !== "complete"}
        <button
            class="absolute top-4 right-4 z-20 px-4 py-2 bg-contrast/80 backdrop-blur rounded-lg text-white text-sm hover:bg-white/20 transition-all pointer-events-auto"
            on:click={handleSkip}
        >
            Skip tutorial
        </button>
    {/if}
</div>
