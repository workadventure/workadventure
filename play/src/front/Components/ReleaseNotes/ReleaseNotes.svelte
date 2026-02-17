<script lang="ts">
    import { onMount } from "svelte";
    import { releaseNotesStore } from "../../Stores/ReleaseNotesStore";
    import { onboardingStore } from "../../Stores/OnboardingStore";
    import ReleaseNotesModal from "./ReleaseNotesModal.svelte";

    onMount(() => {
        // Check immediately if onboarding is already completed
        const onboardingCompleted = onboardingStore.isCompleted();
        releaseNotesStore.checkAndFetch(onboardingCompleted).catch((error) => {
            console.error("Error checking release notes", error);
        });

        // Also check when onboarding completes (user finishes tutorial during session)
        const unsubscribe = onboardingStore.subscribe((step) => {
            if (step === null) {
                // Onboarding completed or was skipped
                releaseNotesStore.checkAndFetch(onboardingStore.isCompleted()).catch((error) => {
                    console.error("Error checking release notes", error);
                });
            }
        });

        return () => unsubscribe();
    });
</script>

{#if $releaseNotesStore.shouldShow && $releaseNotesStore.release}
    <ReleaseNotesModal release={$releaseNotesStore.release} />
{/if}
