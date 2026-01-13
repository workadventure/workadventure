<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { onboardingStore } from "../../Stores/OnboardingStore";
    import { tick } from "svelte";

    export let type: "player" | "bubble" | "lockButton" | "screenShareButton" | "pictureInPictureButton";

    let highlightElement: HTMLElement | null = null;
    let previousElement: HTMLElement | null = null;
    let highlightStyle = "";
    let highlightVisible = false;
    let highlightGraphics: Phaser.GameObjects.Graphics | null = null;

    onMount(() => {
        updateHighlight();
        const interval = setInterval(updateHighlight, 100);
        
        // For player/bubble, create Phaser graphics
        if (type === "player" || type === "bubble") {
            createPhaserHighlight();
        }

        return () => {
            clearInterval(interval);
            destroyPhaserHighlight();
            removeClickInterceptor();
        };
    });

    $: if ($onboardingStore !== "movement" && $onboardingStore !== "communication") {
        destroyPhaserHighlight();
    }

    function createPhaserHighlight() {
        const scene = gameManager.getCurrentGameScene();
        if (!scene) return;

        highlightGraphics = scene.add.graphics();
        highlightGraphics.setDepth(10000); // Very high depth to be on top
        updatePhaserHighlight();
    }

    function updatePhaserHighlight() {
        if (!highlightGraphics) return;
        const scene = gameManager.getCurrentGameScene();
        if (!scene) return;

        const currentPlayer = scene.CurrentPlayer;
        if (!currentPlayer) return;

        highlightGraphics.clear();

        if (type === "player") {
            // Draw pulsing circle around player
            const radius = 60;
            const x = currentPlayer.x;
            const y = currentPlayer.y - 30; // Offset to center on player body

            // Outer glow
            highlightGraphics.lineStyle(4, 0xffff00, 0.8);
            highlightGraphics.strokeCircle(x, y, radius);

            // Inner circle
            highlightGraphics.lineStyle(2, 0xffff00, 1);
            highlightGraphics.strokeCircle(x, y, radius - 4);
        } else if (type === "bubble") {
            // Draw white circle to simulate bubble
            const radius = 80;
            const x = currentPlayer.x;
            const y = currentPlayer.y - 30;

            highlightGraphics.lineStyle(3, 0xffffff, 0.6);
            highlightGraphics.fillStyle(0xffffff, 0.2);
            highlightGraphics.fillCircle(x, y, radius);
            highlightGraphics.strokeCircle(x, y, radius);
        }
    }

    function destroyPhaserHighlight() {
        if (highlightGraphics) {
            highlightGraphics.destroy();
            highlightGraphics = null;
        }
    }

    function removeClickInterceptor() {
        if (previousElement) {
            previousElement.removeEventListener("click", handleClickHighlight, true);
            previousElement = null;
        }
    }

    function addClickInterceptor(element: HTMLElement) {
        // Remove previous interceptor if element changed
        if (previousElement && previousElement !== element) {
            removeClickInterceptor();
        }
        
        // Add new interceptor if not already added
        if (previousElement !== element) {
            element.addEventListener("click", handleClickHighlight, true); // Use capture phase
            previousElement = element;
        }
    }

    async function updateHighlight() {
        await tick();
        
        if (type === "player" || type === "bubble") {
            updatePhaserHighlight();
            highlightVisible = true;
            return;
        }

        let element: HTMLElement | null = null;

        switch (type) {
            case "lockButton":
                element = document.querySelector('[data-testid="lock-button"]') as HTMLElement;
                break;
            case "screenShareButton":
                element = document.querySelector('[data-testid="screenShareButton"]') as HTMLElement;
                break;
            case "pictureInPictureButton":
                element = document.querySelector('[data-testid="pictureInPictureButton"]') as HTMLElement;
                break;
        }

        if (element) {
            // Remove interceptor from previous element if it changed
            if (highlightElement && highlightElement !== element) {
                removeClickInterceptor();
            }
            
            highlightElement = element;
            const rect = element.getBoundingClientRect();
            highlightStyle = `top: ${rect.top + window.scrollY}px; left: ${rect.left + window.scrollX}px; width: ${rect.width}px; height: ${rect.height}px;`;
            highlightVisible = true;
            
            // Add click interceptor to intercept clicks during onboarding
            addClickInterceptor(element);
        } else {
            removeClickInterceptor();
            highlightVisible = false;
        }
    }

    function handleClickHighlight(event: MouseEvent) {
        // Only intercept if we're in the corresponding onboarding step
        const currentStep = $onboardingStore;
        const shouldIntercept = 
            (type === "lockButton" && currentStep === "lockBubble") ||
            (type === "screenShareButton" && currentStep === "screenSharing") ||
            (type === "pictureInPictureButton" && currentStep === "pictureInPicture");
        
        if (shouldIntercept) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            onboardingStore.next();
        }
    }
</script>

{#if highlightVisible && type !== "player" && type !== "bubble" && highlightElement}
    <!-- UI Button highlight -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="fixed z-[2999] pointer-events-none rounded-lg border-4 border-yellow-400 shadow-[0_0_20px_rgba(255,255,0,0.8)] animate-pulse"
        style={highlightStyle}
        data-testid={`onboarding-highlight-${type}`}
    />
{/if}
