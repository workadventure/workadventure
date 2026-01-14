<script lang="ts">
    import { onMount, tick } from "svelte";
    import { PositionMessage_Direction } from "@workadventure/messages";
    import CancelablePromise from "cancelable-promise";
    import type Phaser from "phaser";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { onboardingStore } from "../../Stores/OnboardingStore";
    import { ConversationBubble } from "../../Phaser/Entity/ConversationBubble";
    import { RemotePlayer } from "../../Phaser/Entity/RemotePlayer";
    import { lazyLoadPlayerCharacterTextures } from "../../Phaser/Entity/PlayerTexturesLoadingManager";
    import { scriptingVideoStore } from "../../Stores/ScriptingVideoStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";

    let highlightElement: HTMLElement | null = null;
    let previousElement: HTMLElement | null = null;
    let highlightStyle = "";
    let highlightVisible = false;
    let highlightGraphics: Phaser.GameObjects.Graphics | null = null;
    let pulseAnimationTime = 0;

    // Shared bubble instance across components (module-level variable)
    let sharedBubble: ConversationBubble | null = null;
    let sharedUpdateInterval: ReturnType<typeof setInterval> | null = null;
    let playingEmojiTimeout: ReturnType<typeof setTimeout> | null = null;
    let updatingSimulatedRemotePlayerInterval: ReturnType<typeof setInterval> | null = null;

    // Simulated remote player for onboarding
    let simulatedRemotePlayer: RemotePlayer | null = null;
    let tryingToCreateSimulatedRemotePlayer = false;
    let simulatedPlayerWalking = false;
    let simulatedPlayerTargetX = 0;
    let simulatedPlayerTargetY = 0;
    let simulatedPlayerVideo: Streamable | null = null;

    // Export function to lock bubble (make it red) - can be called from parent component
    export function lockBubble() {
        if (sharedBubble) {
            sharedBubble.setLocked(true);
        }
    }

    onMount(() => {
        void updateHighlight();
        const interval = setInterval(() => {
            void updateHighlight();
        }, 100);

        // Animation loop for pulsing effect (runs at ~60fps)
        const animationInterval = setInterval(() => {
            if ($onboardingStore === "movement" && highlightGraphics) {
                updatePhaserHighlight();
            }
        }, 16);

        return () => {
            clearInterval(interval);
            clearInterval(animationInterval);
            destroyPhaserHighlight();
            destroyConversationBubble();
            destroySimulatedRemotePlayer();
            removeClickInterceptor();
        };
    });

    $: {
        const step = $onboardingStore;

        // Handle player highlight for movement step
        if (step === "movement") {
            if (!highlightGraphics) {
                createPhaserHighlight();
            }
        } else {
            destroyPhaserHighlight();
        }

        // Handle conversation bubble for communication, lockBubble, screenSharing, pictureInPicture steps
        if (
            step === "communication" ||
            step === "lockBubble" ||
            step === "screenSharing" ||
            step === "pictureInPicture"
        ) {
            // Create simulated remote player first (before bubble) when entering communication step
            if (!simulatedRemotePlayer && step === "communication" && !tryingToCreateSimulatedRemotePlayer) {
                tryingToCreateSimulatedRemotePlayer = true;
            }

            // Update bubble users if simulated player was just created
            if (sharedBubble && simulatedRemotePlayer && step === "communication") {
                const scene = gameManager.getCurrentGameScene();
                if (scene) {
                    const currentUserId = scene.connection?.getUserId() ?? 999999;
                    const simulatedUserId = 999998;
                    sharedBubble.updateUsers([currentUserId, simulatedUserId]);
                }
            }

            // Keep bubble white during communication step only
            if (sharedBubble && step === "communication") {
                sharedBubble.setLocked(false);
            }
            // During lockBubble step and later, keep the bubble state as is
            // (it will be set to red when the lock button is clicked)
        } else {
            destroyConversationBubble();
            destroySimulatedRemotePlayer();
        }

        // Update highlights based on current step
        void updateHighlight();
    }

    $: {
        if (tryingToCreateSimulatedRemotePlayer) {
            void createSimulatedRemotePlayer();
        }
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

        if ($onboardingStore === "movement") {
            // Update animation time for pulsing effect
            pulseAnimationTime += 0.05; // Adjust speed of animation

            // Calculate pulsing radius (oscillates between 27 and 37 pixels, ~10cm variation)
            const baseRadius = 32;
            const pulseAmplitude = 5; // 5 pixels variation (~5cm)
            const radius = baseRadius + Math.sin(pulseAnimationTime) * pulseAmplitude;

            const x = currentPlayer.x;
            const y = currentPlayer.y;

            // Outer glow with pulsing effect
            const outerAlpha = 0.6 + Math.sin(pulseAnimationTime) * 0.2;
            highlightGraphics.lineStyle(4, 0xffff00, outerAlpha);
            highlightGraphics.strokeCircle(x, y, radius);
        }
    }

    function destroyPhaserHighlight() {
        if (highlightGraphics) {
            highlightGraphics.destroy();
            highlightGraphics = null;
        }
    }

    function ensureUpdateInterval() {
        // Create update interval if it doesn't exist (for simulated player movement and bubble animation)
        if (!sharedUpdateInterval) {
            sharedUpdateInterval = setInterval(() => {
                const scene = gameManager.getCurrentGameScene();
                const currentPlayer = scene?.CurrentPlayer;
                if (!currentPlayer || !scene) return;

                if (simulatedRemotePlayer) {
                    // Update target position based on current player (in case current player moved)
                    simulatedPlayerTargetX = currentPlayer.x + 64; // Right (2x 32px) of current player
                    simulatedPlayerTargetY = currentPlayer.y;

                    // If player is walking, animate movement towards target
                    if (simulatedPlayerWalking) {
                        const currentX = simulatedRemotePlayer.x;
                        const currentY = simulatedRemotePlayer.y;
                        const dx = simulatedPlayerTargetX - currentX;
                        const dy = simulatedPlayerTargetY - currentY;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        // Speed: ~2 pixels per frame (120 pixels per second)
                        const speed = 2;

                        if (distance > speed) {
                            // Move towards target
                            const moveX = (dx / distance) * speed;
                            const moveY = (dy / distance) * speed;

                            // Determine direction for animation
                            let direction: PositionMessage_Direction = PositionMessage_Direction.DOWN;
                            if (Math.abs(dx) > Math.abs(dy)) {
                                direction = dx > 0 ? PositionMessage_Direction.RIGHT : PositionMessage_Direction.LEFT;
                            } else {
                                direction = dy > 0 ? PositionMessage_Direction.DOWN : PositionMessage_Direction.UP;
                            }

                            // Update position with walking animation (this also sets X, Y, and depth)
                            simulatedRemotePlayer.updatePosition({
                                x: Math.floor(currentX + moveX),
                                y: Math.floor(currentY + moveY),
                                direction,
                                moving: true,
                            });
                        } else {
                            // Reached target, stop walking
                            simulatedRemotePlayer.updatePosition({
                                x: Math.floor(simulatedPlayerTargetX),
                                y: Math.floor(simulatedPlayerTargetY),
                                direction: PositionMessage_Direction.DOWN,
                                moving: false,
                            });
                            simulatedPlayerWalking = false;

                            // Create bubble once the simulated player has finished moving
                            if (!sharedBubble) {
                                const isLocked =
                                    $onboardingStore === "screenSharing" || $onboardingStore === "pictureInPicture";
                                createConversationBubble(isLocked);
                            }

                            // Play video when the simulated player enters the bubble
                            if (!simulatedPlayerVideo) {
                                // Choose a random video between 1 and 5
                                const randomVideoNumber = Math.floor(Math.random() * 5) + 1;
                                const videoUrl = `/static/Videos/onboarding/ia-generation-remoteoffice${randomVideoNumber}.mp4`;
                                simulatedPlayerVideo = scriptingVideoStore.addVideo(videoUrl, {
                                    name: "Demo User",
                                    loop: true,
                                });
                            }

                            // Play wave emoji when reaching the target
                            if (playingEmojiTimeout) clearTimeout(playingEmojiTimeout);
                            playingEmojiTimeout = setTimeout(() => {
                                if (simulatedRemotePlayer) {
                                    simulatedRemotePlayer.playEmote("👋");
                                }
                            }, 300);
                        }
                    } else {
                        // Not walking, just follow current player position (stay to the left)
                        const targetX = currentPlayer.x + 64;
                        const targetY = currentPlayer.y;
                        simulatedRemotePlayer.setX(targetX);
                        simulatedRemotePlayer.setY(targetY);
                        simulatedRemotePlayer.setDepth(targetY);
                    }

                    // Update bubble position if it exists
                    if (sharedBubble) {
                        const centerX = (currentPlayer.x + simulatedRemotePlayer.x) / 2;
                        const centerY = (currentPlayer.y - 30 + (simulatedRemotePlayer.y - 30)) / 2;
                        sharedBubble.setCenter(centerX, centerY);
                        sharedBubble.step(); // Animate the bubble
                    }
                } else if (sharedBubble) {
                    // No simulated player, just center on current player
                    sharedBubble.setCenter(currentPlayer.x, currentPlayer.y - 30);
                    sharedBubble.step(); // Animate the bubble
                }

                scene.markDirty();
            }, 16); // ~60fps
        }
    }

    function createConversationBubble(isLocked: boolean = false) {
        const scene = gameManager.getCurrentGameScene();
        if (!scene) return;

        const currentPlayer = scene.CurrentPlayer;
        if (!currentPlayer) return;

        // Don't create if already exists (shared across components)
        if (sharedBubble) return;

        // Get current player's user ID (or use a fake one for demo)
        const userId = scene.connection?.getUserId() ?? 999999;
        const simulatedUserId = 999998;

        // Create bubble at player position, initially unlocked (white)
        // Include simulated player ID if it exists (use local variable to avoid reactive loop)
        const currentSimulatedPlayer = simulatedRemotePlayer;
        const bubbleUserIds = currentSimulatedPlayer ? [userId, simulatedUserId] : [userId];

        sharedBubble = new ConversationBubble(
            scene,
            currentPlayer.x,
            currentPlayer.y - 30, // Offset to center on player body
            isLocked, // Always start unlocked (white)
            bubbleUserIds // Current player and simulated player in the bubble
        );

        // Ensure update interval exists for bubble animation
        ensureUpdateInterval();
    }

    function destroyConversationBubble() {
        if (sharedUpdateInterval) {
            clearInterval(sharedUpdateInterval);
            sharedUpdateInterval = null;
        }
        if (sharedBubble) {
            sharedBubble.destroy();
            sharedBubble = null;
        }
    }

    async function createSimulatedRemotePlayer() {
        const scene = gameManager.getCurrentGameScene();
        if (!scene) {
            tryingToCreateSimulatedRemotePlayer = false;
            return;
        }

        const currentPlayer = scene.CurrentPlayer;
        if (!currentPlayer) {
            tryingToCreateSimulatedRemotePlayer = false;
            return;
        }

        // Don't create if already exists
        if (simulatedRemotePlayer) {
            tryingToCreateSimulatedRemotePlayer = false;
            return;
        }

        // Get current player's texture IDs to exclude them
        const currentPlayerTextureIds = gameManager.getCharacterTextureIds();
        const currentPlayerWokaId =
            currentPlayerTextureIds && currentPlayerTextureIds.length > 0 ? currentPlayerTextureIds[0] : null;

        // Load woka data and get all available textures
        const wokaData = await gameManager.loadWokaData();

        // Collect all available woka textures from all collections
        const allWokaTextures: Array<{ id: string; url: string }> = [];
        for (const collection of wokaData.woka.collections) {
            for (const texture of collection.textures) {
                allWokaTextures.push({ id: texture.id, url: texture.url });
            }
        }

        // Filter out the current player's woka texture
        const availableTextures = allWokaTextures.filter((texture) => texture.id !== currentPlayerWokaId);

        // If no available textures (shouldn't happen), fallback to any texture
        const selectedTexture =
            availableTextures.length > 0
                ? availableTextures[Math.floor(Math.random() * availableTextures.length)]
                : allWokaTextures[Math.floor(Math.random() * allWokaTextures.length)];

        const texturesPromise = lazyLoadPlayerCharacterTextures(scene.superLoad, [selectedTexture]);
        const companionTexturePromise = new CancelablePromise<string>((_, reject) => {
            reject(new Error("No companion texture"));
        });

        // Get camera viewport to position player at the right edge
        const camera = scene.cameras.main;
        const viewportRight = camera.scrollX + camera.width;

        // Position the simulated player at the right edge of the viewport
        const startX = viewportRight;
        const startY = currentPlayer.y; // Same Y as current player

        // Target position: to the left of the current player (where the bubble will be)
        simulatedPlayerTargetX = currentPlayer.x + 64;
        simulatedPlayerTargetY = currentPlayer.y;

        try {
            // Create a unique ID for the simulated player (use a high number to avoid conflicts)
            const simulatedUserId = 999998;
            const simulatedUserUuid = "onboarding-simulated-player";

            // Use local variable to avoid race condition
            const newSimulatedPlayer = new RemotePlayer(
                simulatedUserId,
                simulatedUserUuid,
                scene,
                startX,
                startY,
                "Demo User", // Name for the simulated player
                texturesPromise,
                PositionMessage_Direction.LEFT, // Start facing left (towards the player)
                false, // Not moving initially
                null, // No visit card
                companionTexturePromise
            );

            newSimulatedPlayer.setVisible(false);

            // Note: We don't add the simulated player to MapPlayersByKey to avoid
            // the "Not the same count of players" error, as it's not in the remotePlayersRepository
            // The player will still be rendered as it's added to the Phaser scene via RemotePlayer constructor

            // Assign to shared variable immediately to avoid race condition
            // This must happen before any async operations that might read simulatedRemotePlayer
            if (simulatedRemotePlayer !== newSimulatedPlayer) {
                simulatedRemotePlayer = newSimulatedPlayer;
            }

            // Ensure update interval exists for player movement
            ensureUpdateInterval();

            // Wait for textures to load, then start walking animation
            // Use the local variable directly to avoid race condition
            if (updatingSimulatedRemotePlayerInterval) clearInterval(updatingSimulatedRemotePlayerInterval);
            updatingSimulatedRemotePlayerInterval = setInterval(() => {
                // Use only the local variable to avoid race condition - don't read simulatedRemotePlayer
                if (newSimulatedPlayer != undefined) {
                    // Start walking towards the target
                    simulatedPlayerWalking = true;
                    newSimulatedPlayer.updatePosition({
                        x: Math.floor(startX),
                        y: Math.floor(startY),
                        direction: PositionMessage_Direction.LEFT,
                        moving: true,
                    });
                    if (newSimulatedPlayer.visible === false) newSimulatedPlayer.setVisible(true);
                } else {
                    console.warn("Simulated remote player is not the same instance we created");
                    destroySimulatedRemotePlayer(newSimulatedPlayer);
                    if (updatingSimulatedRemotePlayerInterval) clearInterval(updatingSimulatedRemotePlayerInterval);
                    updatingSimulatedRemotePlayerInterval = null;
                }
            }, 500);

            // Update bubble to include the simulated player if it already exists
            if (sharedBubble) {
                const currentUserId = scene.connection?.getUserId() ?? 999999;
                sharedBubble.updateUsers([currentUserId, simulatedUserId]);
            }
        } catch (error) {
            console.warn("Error creating simulated remote player for onboarding", error);
        } finally {
            tryingToCreateSimulatedRemotePlayer = false;
        }
    }

    function destroySimulatedRemotePlayer(newSimulatedPlayer_?: RemotePlayer) {
        if (simulatedRemotePlayer) {
            // Note: We don't need to remove from MapPlayersByKey as we never added it
            simulatedRemotePlayer.destroy();
            simulatedRemotePlayer = null;
        }
        if (simulatedPlayerVideo) {
            scriptingVideoStore.removeVideo(simulatedPlayerVideo.uniqueId);
            simulatedPlayerVideo = null;
        }
        simulatedPlayerWalking = false;
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
        if (!previousElement || previousElement !== element) {
            // The event listener is properly removed in removeClickInterceptor() which is called:
            // 1. In onMount cleanup (line 61)
            // 2. When the element changes (line 460)
            // 3. When updateHighlight() is called with no element (line 514)
            // eslint-disable-next-line listeners/no-missing-remove-event-listener
            element.addEventListener("click", handleClickHighlight, true); // Use capture phase
            previousElement = element;
        }
    }

    async function updateHighlight() {
        await tick();

        const step = $onboardingStore;

        // Handle player highlight for movement step
        if (step === "movement") {
            updatePhaserHighlight();
            highlightVisible = false; // Phaser highlight, not DOM
            removeClickInterceptor();
            return;
        }

        // Handle UI button highlights based on current step
        let element: HTMLElement | null = null;

        switch (step) {
            case "lockBubble":
                element = document.querySelector('[data-testid="lock-button"]') as HTMLElement;
                break;
            case "screenSharing":
                element = document.querySelector('[data-testid="screenShareButton"]') as HTMLElement;
                break;
            case "pictureInPicture":
                element = document.querySelector('[data-testid="pictureInPictureButton"]') as HTMLElement;
                break;
            default:
                element = null;
        }

        if (element) {
            // Remove interceptor from previous element if it changed
            if (highlightElement && highlightElement !== element) {
                removeClickInterceptor();
            }

            highlightElement = element;
            const rect = element.getBoundingClientRect();
            highlightStyle = `top: ${rect.top + window.scrollY}px; left: ${rect.left + window.scrollX}px; width: ${
                rect.width
            }px; height: ${rect.height}px;`;
            highlightVisible = true;

            // Add click interceptor to intercept clicks during onboarding
            addClickInterceptor(element);
        } else {
            removeClickInterceptor();
            highlightVisible = false;
            highlightElement = null;
        }
    }

    function handleClickHighlight(event: MouseEvent) {
        const step = $onboardingStore;
        const shouldIntercept = step === "lockBubble" || step === "screenSharing" || step === "pictureInPicture";

        if (!shouldIntercept) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        // If it's the lock button, turn the bubble red before advancing
        if (step === "lockBubble" && sharedBubble) {
            sharedBubble.setLocked(true);
        }
        onboardingStore.next();
    }
</script>

{#if highlightVisible && highlightElement}
    <!-- UI Button highlight -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="fixed z-[2999] pointer-events-none rounded-lg border-4 border-yellow-400 shadow-[0_0_20px_rgba(255,255,0,0.8)] animate-pulse"
        style={highlightStyle}
        data-testid={`onboarding-highlight-${$onboardingStore}`}
    />
{/if}
