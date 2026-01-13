<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { onboardingStore } from "../../Stores/OnboardingStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { hasMovedEventName } from "../../Phaser/Player/Player";
    import { currentPlayerGroupLockStateStore } from "../../Stores/CurrentPlayerGroupStore";
    import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
    import { activePictureInPictureStore } from "../../Stores/PeerStore";
    import { get } from "svelte/store";
    import OnboardingStep from "./OnboardingStep.svelte";
    import OnboardingHighlight from "./OnboardingHighlight.svelte";
    import WelcomeStep from "./Steps/WelcomeStep.svelte";
    import MovementStep from "./Steps/MovementStep.svelte";
    import CommunicationStep from "./Steps/CommunicationStep.svelte";
    import LockBubbleStep from "./Steps/LockBubbleStep.svelte";
    import ScreenSharingStep from "./Steps/ScreenSharingStep.svelte";
    import PictureInPictureStep from "./Steps/PictureInPictureStep.svelte";
    import CompleteStep from "./Steps/CompleteStep.svelte";

    let movementDetected = false;
    let movementTimeout: NodeJS.Timeout | null = null;
    let onboardingHighlight: OnboardingHighlight | null = null;

    onMount(() => {
        // Listen to player movement for step 2
        const scene = gameManager.getCurrentGameScene();
        const currentPlayer = scene?.CurrentPlayer;
        if (currentPlayer) {
            currentPlayer.on(hasMovedEventName, handlePlayerMove);
        }

        // Auto-start onboarding if not completed (with a small delay to ensure scene is loaded)
        setTimeout(() => {
            if (!$onboardingStore && !onboardingStore.isCompleted()) {
                onboardingStore.start();
            }
        }, 1000);
    });

    onDestroy(() => {
        const currentPlayer = gameManager.getCurrentGameScene()?.CurrentPlayer;
        if (currentPlayer) {
            currentPlayer.off(hasMovedEventName, handlePlayerMove);
        }
        if (movementTimeout) {
            clearTimeout(movementTimeout);
        }
    });

    function handlePlayerMove() {
        if ($onboardingStore === "movement" && !movementDetected) {
            movementDetected = true;
            // Wait 2 seconds after movement before auto-advancing
            if (movementTimeout) {
                clearTimeout(movementTimeout);
            }
            movementTimeout = setTimeout(() => {
                onboardingStore.next();
            }, 2000);
        }
    }

    function handleNext() {
        // If we're in the lockBubble step, lock the bubble (make it red) before advancing
        if ($onboardingStore === "lockBubble" && onboardingHighlight) {
            onboardingHighlight.lockBubble();
        }
        onboardingStore.next();
        movementDetected = false;
    }

    function handleSkip() {
        onboardingStore.skip();
    }

    // Watch for step completion conditions
    $: {
        // Note: lockBubble step completion is handled by click interceptor in OnboardingHighlight
        if ($onboardingStore === "screenSharing" && get(requestedScreenSharingState)) {
            setTimeout(() => onboardingStore.next(), 1000);
        }
        if ($onboardingStore === "pictureInPicture" && get(activePictureInPictureStore)) {
            setTimeout(() => onboardingStore.next(), 1000);
        }
    }
</script>

{#if $onboardingStore}
    <OnboardingStep on:next={handleNext} on:skip={handleSkip}>
        {#if $onboardingStore === "welcome"}
            <WelcomeStep on:next={handleNext} on:skip={handleSkip} />
        {:else if $onboardingStore === "movement"}
            <MovementStep on:next={handleNext} />
        {:else if $onboardingStore === "communication"}
            <CommunicationStep on:next={handleNext} />
        {:else if $onboardingStore === "lockBubble"}
            <LockBubbleStep on:next={handleNext} />
        {:else if $onboardingStore === "screenSharing"}
            <ScreenSharingStep on:next={handleNext} />
        {:else if $onboardingStore === "pictureInPicture"}
            <PictureInPictureStep on:next={handleNext} />
        {:else if $onboardingStore === "complete"}
            <CompleteStep on:next={handleNext} />
        {/if}
    </OnboardingStep>
    <OnboardingHighlight bind:this={onboardingHighlight} />
{/if}
