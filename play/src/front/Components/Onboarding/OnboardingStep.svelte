<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { fade } from "svelte/transition";
    import { onboardingStore } from "../../Stores/OnboardingStore";

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
    <!-- Overlay with gray background and blur - only for welcome step -->
    {#if $onboardingStore === "welcome"}
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" />
    {/if}

    <!-- Content slot -->
    <div class="relative z-10 pointer-events-none">
        <slot />
    </div>
</div>
