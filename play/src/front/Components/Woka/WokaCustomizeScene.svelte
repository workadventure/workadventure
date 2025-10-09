<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { ABSOLUTE_PUSHER_URL } from "../../Enum/ComputedConst";
    import { areCharacterTexturesValid } from "../../Connection/LocalUserUtils";
    import BodyIcon from "../Icons/BodyIcon.svelte";
    import EyesIcon from "../Icons/EyesIcon.svelte";
    import HairIcon from "../Icons/HairIcon.svelte";
    import HangerIcon from "../Icons/HangerIcon.svelte";
    import HatIcon from "../Icons/HatIcon.svelte";
    import SwordIcon from "../Icons/SwordIcon.svelte";
    import ShuffleIcon from "../Icons/ShuffleIcon.svelte";
    import WokaPreview from "./WokaPreview.svelte";
    import type { WokaBodyPart, WokaData, WokaTexture } from "./WokaTypes";
    import { getItemsPerRow } from "./ItemsPerRow";
    import WokaImage from "./WokaImage.svelte";

    export let back: () => void;
    export let saveAndContinue: (texturesId: string[]) => void;

    let wokaData: WokaData | null = null;
    let selectedBodyPart: WokaBodyPart = "body";
    let selectedTextures: Record<WokaBodyPart, string> = {
        body: "",
        eyes: "",
        hair: "",
        clothes: "",
        hat: "",
        accessory: "",
    };
    let isLoading = true;
    let error = "";
    let assetsDirection: number = 0;

    const bodyPartOrder: WokaBodyPart[] = ["body", "eyes", "hair", "clothes", "hat", "accessory"];

    async function loadWokaData() {
        try {
            isLoading = true;
            const roomUrl = gameManager.currentStartedRoom.href;
            const response = await fetch(`${ABSOLUTE_PUSHER_URL}woka/list?roomUrl=${encodeURIComponent(roomUrl)}`, {
                headers: {
                    Authorization: localUserStore.getAuthToken() || "",
                },
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Failed to load Woka data");
            }

            const data = await response.json();
            wokaData = data;

            loadSavedTextures();
        } catch (err) {
            console.error("Error loading Woka data:", err);
            error = "Failed to load Woka customization data";
        } finally {
            isLoading = false;
        }
    }

    function loadSavedTextures() {
        try {
            const savedTextureIds = gameManager.getCharacterTextureIds();
            // Check that textures exist in the Woka data
            if (!wokaData) {
                throw new Error("Woka data is not loaded");
            }

            // Check if current textures is in the collections list
            const hasCustomizeTexture = [
                ...wokaData.body.collections,
                ...wokaData.eyes.collections,
                ...wokaData.hair.collections,
                ...wokaData.clothes.collections,
                ...wokaData.hat.collections,
                ...wokaData.accessory.collections,
            ].find((collection) =>
                collection.textures.find((texture) => savedTextureIds != null && savedTextureIds.includes(texture.id))
            );

            // Initialize textures of customize Woka scene
            if (hasCustomizeTexture && savedTextureIds && savedTextureIds.length > 0) {
                bodyPartOrder.forEach((bodyPart, index) => {
                    if (savedTextureIds[index]) {
                        selectedTextures[bodyPart] = savedTextureIds[index];
                    }
                });
            } else {
                bodyPartOrder.forEach((bodyPart) => {
                    if (wokaData?.[bodyPart]?.collections?.[0]?.textures?.[0]) {
                        selectedTextures[bodyPart] = wokaData[bodyPart].collections[0].textures[0].id;
                    }
                });
            }
            // Trigger reactivity
            selectedTextures = { ...selectedTextures };
        } catch (err) {
            console.warn("Cannot load previous WOKA textures:", err);
        }
    }

    function selectTexture(bodyPart: WokaBodyPart, textureId: string) {
        selectedTextures[bodyPart] = textureId;
        selectedTextures = { ...selectedTextures };
    }

    function randomizeOutfit() {
        bodyPartOrder.forEach((bodyPart) => {
            if (wokaData?.[bodyPart]?.collections?.[0]?.textures) {
                const textures = wokaData[bodyPart].collections[0].textures;
                const randomIndex = Math.floor(Math.random() * textures.length);
                selectedTextures[bodyPart] = textures[randomIndex].id;
            }
        });
        selectedTextures = { ...selectedTextures }; // Trigger reactivity
    }

    function handlerSaveAndContinue() {
        try {
            const textureIds = bodyPartOrder.map((bodyPart) => selectedTextures[bodyPart]).filter(Boolean);
            if (!areCharacterTexturesValid(textureIds)) {
                error = "Invalid character textures";
                return;
            }

            saveAndContinue(textureIds);
        } catch (err) {
            console.error("Error saving textures:", err);
            error = "Failed to save character customization";
        }
    }

    function getAvailableTextures(collectionIndex: number, bodyPart: WokaBodyPart): WokaTexture[] {
        const textures = wokaData?.[bodyPart]?.collections?.[collectionIndex]?.textures || [];
        // If no body texture is selected, return the first texture by default
        /*if (bodyPart === "body" && !textures.map((texture) => texture.id).includes(selectedTextures[bodyPart])) {
            selectTexture("body", textures[0].id);
        }*/

        return textures;
    }

    function getTextureUrl(relativeUrl: string): string {
        if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
            return relativeUrl;
        }

        return `${ABSOLUTE_PUSHER_URL}${relativeUrl}`;
    }

    function getBodyPartIcon(bodyPart: WokaBodyPart) {
        switch (bodyPart) {
            case "body":
                return BodyIcon;
            case "eyes":
                return EyesIcon;
            case "hair":
                return HairIcon;
            case "clothes":
                return HangerIcon;
            case "hat":
                return HatIcon;
            case "accessory":
                return SwordIcon;
            default:
                return null;
        }
    }

    let timeOutToScroll: ReturnType<typeof setTimeout> | null = null;
    function selectBodyPart(bodyPart: WokaBodyPart) {
        selectedBodyPart = bodyPart;

        // Clear previous timeout if it exists
        if (timeOutToScroll) clearTimeout(timeOutToScroll);
        timeOutToScroll = setTimeout(() => {
            timeOutToScroll = null; // Reset timeout variable
            // Check if texture to the body part selected is empty
            if (selectedTextures[selectedBodyPart] === "") return;
            // Get element by body part and texture id
            let element = document.getElementById(`texture-${selectedBodyPart}-${selectedTextures[selectedBodyPart]}`);
            // If element is not found, do nothing
            if (!element) {
                // Get the first texture of the body part element
                element = document.querySelector(
                    `#texture-${selectedBodyPart}-${wokaData?.[selectedBodyPart]?.collections?.[0]?.textures?.[0]?.id}`
                );
                if (!element) return; // If still not found, exit
            }
            // Scroll to the element
            element.scrollIntoView({ behavior: "smooth", block: "end", inline: "end" });
        }, 100); // Delay to ensure the DOM is updated
    }

    let enterPressed = false;

    // Function to handle keyboard navigation
    function useKeyBoardNavigation(event: KeyboardEvent) {
        if (!wokaData) return;
        if (
            event.key === "ArrowLeft" ||
            event.key === "ArrowRight" ||
            event.key === "ArrowUp" ||
            event.key === "ArrowDown"
        ) {
            event.preventDefault();
            const textures = [];
            if (wokaData[selectedBodyPart]) {
                textures.push(...wokaData[selectedBodyPart].collections.flatMap((collection) => collection.textures));
            }
            const currentIndex = textures.findIndex((texture) => texture.id === selectedTextures[selectedBodyPart]);
            let newIndex = currentIndex;
            if (event.key === "ArrowLeft") {
                newIndex = Math.max(currentIndex - 1, 0);
            } else if (event.key === "ArrowRight") {
                newIndex = Math.min(currentIndex + 1, textures.length - 1);
            } else if (event.key === "ArrowUp") {
                const itemsPerRow = getItemsPerRow(document.getElementById(`woka-line-0`));
                newIndex = Math.max(currentIndex - itemsPerRow, 0);
            } else if (event.key === "ArrowDown") {
                const itemsPerRow = getItemsPerRow(document.getElementById(`woka-line-0`));
                newIndex = Math.min(currentIndex + itemsPerRow, textures.length - 1);
            }
            if (newIndex !== currentIndex) {
                selectTexture(selectedBodyPart, textures[newIndex].id);
                // Scroll to the newly selected texture
                const element = document.getElementById(`texture-${selectedBodyPart}-${textures[newIndex].id}`);
                if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
                }
            }
        } else if (event.key === "Enter") {
            enterPressed = true;
        }
    }

    function useKeyBoardNavigationUp(event: KeyboardEvent) {
        if (!wokaData) return;
        if (event.key === "Enter" && enterPressed) {
            enterPressed = false;
            if (selectedBodyPart === "accessory") {
                // If it's the last body part, save and continue
                handlerSaveAndContinue();
            } else {
                selectNextBodyPart();
            }
        }
    }

    function selectNextBodyPart() {
        const currentIndex = bodyPartOrder.indexOf(selectedBodyPart);
        const nextIndex = (currentIndex + 1) % bodyPartOrder.length;
        selectedBodyPart = bodyPartOrder[nextIndex];
    }

    onMount(async () => {
        await loadWokaData();
        selectedBodyPart = bodyPartOrder[0];
        // Document event listener for keyboard navigation
        document.addEventListener("keydown", useKeyBoardNavigation);
        document.addEventListener("keyup", useKeyBoardNavigationUp);
    });

    onDestroy(() => {
        // Remove keyboard navigation listener
        document.removeEventListener("keydown", useKeyBoardNavigation);
        document.removeEventListener("keyup", useKeyBoardNavigationUp);
    });
</script>

<div class="mobile-webkit bg-contrast w-screen md:!mt-[15vh] h-full md:!h-[70vh] flex items-center justify-center">
    <div
        class="mobile-webkit rounded-lg flex flex-col max-w-4xl w-full h-full m-4 relative bg-white/10 backdrop-blur-md"
    >
        {#if isLoading}
            <div class="flex items-center justify-center h-64">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
        {:else if error}
            <div class="text-center text-red-600 mb-4">
                <p>{error}</p>
                <button class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" on:click={loadWokaData}>
                    Retry
                </button>
            </div>
        {:else}
            <div class="flex-1 flex flex-col sm:flex-row items-start gap-6 min-h-0 p-6">
                <div class="flex flex-row gap-4 w-full sm:w-fit">
                    <div class="flex flex-col gap-2">
                        <WokaPreview
                            {selectedTextures}
                            {wokaData}
                            {getTextureUrl}
                            on:rotate={(e) => {
                                assetsDirection = e.detail.direction;
                            }}
                        />

                        <div class="mt-4 space-y-2">
                            <button
                                class="btn btn-sm btn-light btn-border w-full px-4 py-2 bg-white/10 text-white rounded hover:bg-white/10 flex flex-row items-center justify-center gap-2"
                                on:click={randomizeOutfit}
                            >
                                <ShuffleIcon fillColor="white" width="w-4" height="h-4" />
                                <span>{$LL.woka.customWoka.randomize()}</span>
                            </button>
                        </div>
                    </div>
                    <div class="flex flex-col gap-0 mb-4 w-full lg:w-fit sm:hidden">
                        {#each bodyPartOrder as bodyPart (bodyPart)}
                            <button
                                class="flex-1 px-4 py-2 flex-grow capitalize flex flex-row items-center justify-center gap-2 border-b-2 {selectedBodyPart ===
                                bodyPart
                                    ? 'text-white border-white'
                                    : 'text-white/50 border-white/10'}"
                                on:click={() => (selectedBodyPart = bodyPart)}
                                style="border-bottom-style: solid;"
                            >
                                <svelte:component
                                    this={getBodyPartIcon(bodyPart)}
                                    height="h-5"
                                    width="w-5"
                                    strokeColor={selectedBodyPart === bodyPart ? "stroke-white " : "stroke-white/50"}
                                    fillColor={selectedBodyPart === bodyPart ? "fill-white " : "fill-white/50"}
                                />
                                {bodyPart}
                            </button>
                        {/each}
                    </div>
                </div>

                <div class="flex flex-col flex-1 h-full min-h-0 min-w-0">
                    <div class="flex-wrap gap-0 mb-4 w-full sm:flex hidden">
                        {#each bodyPartOrder as bodyPart (bodyPart)}
                            <button
                                class="flex-1 px-4 py-2 capitalize flex flex-row items-center justify-center gap-2 border-b-2 {selectedBodyPart ===
                                bodyPart
                                    ? 'text-white border-white'
                                    : 'text-white/50 border-white/10'}"
                                on:click={() => selectBodyPart(bodyPart)}
                                style="border-bottom-style: solid;"
                            >
                                <svelte:component
                                    this={getBodyPartIcon(bodyPart)}
                                    height="h-5"
                                    width="w-5"
                                    strokeColor={selectedBodyPart === bodyPart ? "stroke-white " : "stroke-white/50"}
                                    fillColor={selectedBodyPart === bodyPart ? "fill-white " : "fill-white/50"}
                                />
                                {bodyPart}
                            </button>
                        {/each}
                    </div>

                    <div class="rounded-lg flex flex-col flex-1 min-h-0 min-w-0">
                        <h3 class="text-lg font-semibold capitalize">
                            {selectedBodyPart} Options
                        </h3>
                        <div
                            class="flex-none lg:flex-1 flex flex-col items-start gap-0 min-h-0 min-w-0 max-h-full overflow-y-scroll overflow-x-auto scroll-mask py-[20px]"
                        >
                            {#each wokaData?.[selectedBodyPart]?.collections || [] as collection, collectionIndex (collection.name)}
                                <p class="text-sm text-gray-500 mb-1 mt-4 p-0">{collection.name}</p>
                                <div
                                    class="w-full flex flex-row flex-wrap items-start justify-start gap-3"
                                    id={`woka-line-${collectionIndex}`}
                                >
                                    {#each getAvailableTextures(collectionIndex, selectedBodyPart) as texture (texture.id)}
                                        <button
                                            class="rounded border border-solid box-border p-0 h-fit {selectedTextures[
                                                selectedBodyPart
                                            ] === texture.id
                                                ? 'bg-white/50 border-white'
                                                : 'bg-white/10 hover:bg-white/20 border-transparent'}"
                                            on:click={() => selectTexture(selectedBodyPart, texture.id)}
                                            id={`texture-${selectedBodyPart}-${texture.id}`}
                                        >
                                            <WokaImage
                                                selectedTextures={{ [selectedBodyPart]: texture.id }}
                                                {wokaData}
                                                {getTextureUrl}
                                                classList="p-2"
                                                direction={assetsDirection}
                                            />
                                        </button>
                                    {/each}
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>
            <div
                class="w-full p-3 flex flex-row items-center gap-2 border-t-2 border-t-white/10"
                style="border-top-style: solid;"
            >
                <button class="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded" on:click={back}>
                    {$LL.woka.customWoka.navigation.backToDefaultWoka()}
                </button>
                <button
                    class="selectCharacterSceneFormSubmit w-full px-4 py-3 bg-secondary text-white rounded hover:bg-secondary-600"
                    on:click={handlerSaveAndContinue}
                >
                    {$LL.woka.customWoka.navigation.finish()}
                </button>
            </div>
        {/if}
    </div>
</div>

<style>
    .mobile-webkit {
        max-height: -webkit-fill-available !important;
    }
    .scroll-mask {
        mask-image: linear-gradient(to bottom, transparent 0px, black 40px, black calc(100% - 40px), transparent 100%);
        -webkit-mask-image: linear-gradient(
            to bottom,
            transparent 0px,
            black 40px,
            black calc(100% - 40px),
            transparent 100%
        );
    }
</style>
