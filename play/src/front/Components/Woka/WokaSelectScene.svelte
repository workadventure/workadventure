<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { ABSOLUTE_PUSHER_URL } from "../../Enum/ComputedConst";
    import WokaPreview from "./WokaPreview.svelte";
    import type { WokaCollection, WokaData, WokaTexture } from "./WokaTypes";
    import { getItemsPerRow } from "./ItemsPerRow";
    import WokaImage from "./WokaImage.svelte";
    import { IconShuffle } from "@wa-icons";

    export let customize: () => void;
    export let saveAndContinue: (texturesId: string[]) => void;

    let wokaData: WokaData | null = null;
    let currentWokaCollection: WokaCollection | null = null;
    let selectedWokaTextureId: Record<string, string>;
    let isLoading = true;
    let error = "";
    let assetsDirection: number = 0;

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

            wokaData = await response.json();

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
            // find the collection used to select the Woka
            const collectionIndex = wokaData?.["woka"]?.collections.findIndex((c: WokaCollection) =>
                c.textures.find((t: WokaTexture) => t.id === savedTextureIds?.[0])
            );
            if (collectionIndex === undefined || collectionIndex < 0) {
                throw new Error("No valid Woka collection found for the saved texture ID");
            }
            selectTexture(
                collectionIndex,
                savedTextureIds != null
                    ? savedTextureIds[0]
                    : wokaData?.["woka"]?.collections?.[0]?.textures?.[0]?.id || ""
            );

            // Scroll to the selected collection
            setTimeout(() => {
                const element = document.getElementById(`woka-${selectedWokaTextureId["woka"]}`);
                if (element == undefined) return;
                element.scrollIntoView({ behavior: "smooth", block: "end" });
            }, 800);
        } catch (err) {
            console.warn("Cannot load previous WOKA textures:", err);
            selectTexture(0, wokaData?.["woka"]?.collections?.[0]?.textures?.[0]?.id || "");
        } finally {
            // Find the collection used to select the Woka
            currentWokaCollection = (wokaData as WokaData)["woka"].collections.find((c: WokaCollection) =>
                c.textures.find((t: WokaTexture) => t.id === selectedWokaTextureId["woka"])
            ) as WokaCollection;
            selectCurrentCollection(currentWokaCollection.name);
        }
    }

    function selectCurrentCollection(collectionName: string) {
        // Check if the collection exists in the wokaData
        if (!wokaData || !wokaData["woka"] || !wokaData["woka"].collections) {
            console.error("Woka data is not loaded or invalid");
            throw new Error("Woka data is not loaded or invalid");
        }
        const collection = wokaData["woka"].collections.find((c: WokaCollection) => c.name === collectionName);
        if (!collection) {
            console.error(`Collection ${collectionName} does not exist in the Woka data`);
            throw new Error(`Collection ${collectionName} does not exist in the Woka data`);
        }
        currentWokaCollection = collection;
    }

    function selectTexture(collectionIndex: number, textureId: string) {
        // check that the textureId is existing in the wokaData
        if (!wokaData || !wokaData["woka"] || !wokaData["woka"].collections) {
            console.error("Woka data is not loaded or invalid");
            throw new Error("Woka data is not loaded or invalid");
        }
        const textures = wokaData["woka"].collections[collectionIndex].textures;
        if (!textures.some((texture: WokaTexture) => texture.id === textureId)) {
            console.error(`Texture ID ${textureId} does not exist in the Woka data`);
            throw new Error(`Texture ID ${textureId} does not exist in the Woka data`);
        }

        selectedWokaTextureId = { woka: textureId }; // Trigger reactivity
    }

    function randomizeOutfit() {
        if (!wokaData) return;
        const randomCollectionIndex = Math.floor(Math.random() * wokaData["woka"].collections.length);
        const randomTexture =
            wokaData["woka"].collections[randomCollectionIndex].textures[
                Math.floor(Math.random() * wokaData["woka"].collections[randomCollectionIndex].textures.length)
            ];
        selectedWokaTextureId = { woka: randomTexture.id };
    }

    function getTextureUrl(relativeUrl: string): string {
        if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
            return relativeUrl;
        }

        return `${ABSOLUTE_PUSHER_URL}${relativeUrl}`;
    }

    let enterPressed = false;

    // Function to validate character textures
    function useKeyBoardNavigation(event: KeyboardEvent) {
        if (!wokaData || !currentWokaCollection) return;
        if (
            event.key === "ArrowLeft" ||
            event.key === "ArrowRight" ||
            event.key === "ArrowUp" ||
            event.key === "ArrowDown"
        ) {
            event.preventDefault();
            const currentCollectionIndex = wokaData?.["woka"]?.collections.findIndex(
                (c: WokaCollection) => c.name === currentWokaCollection?.name
            );
            if (currentCollectionIndex === undefined || currentCollectionIndex < 0) return;

            const textures = wokaData["woka"].collections[currentCollectionIndex].textures;
            const currentTextureIndex = textures.findIndex((t: WokaTexture) => t.id === selectedWokaTextureId["woka"]);

            let newIndex = currentCollectionIndex;
            if (event.key === "ArrowLeft") {
                newIndex = Math.max(currentTextureIndex - 1, 0);
            } else if (event.key === "ArrowRight") {
                newIndex = Math.min(currentTextureIndex + 1, textures.length - 1);
            } else if (event.key === "ArrowUp") {
                const itemsPerRow = getItemsPerRow(document.getElementById(`woka-line-0`));
                newIndex = Math.max(currentTextureIndex - itemsPerRow, 0);
            } else if (event.key === "ArrowDown") {
                const itemsPerRow = getItemsPerRow(document.getElementById(`woka-line-0`));
                newIndex = Math.min(currentTextureIndex + itemsPerRow, textures.length - 1);
            }
            if (newIndex !== currentTextureIndex) {
                selectTexture(currentCollectionIndex, textures[newIndex].id);
                // Scroll to the newly selected texture
                const element = document.getElementById(`woka-${textures[newIndex].id}`);
                if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
                }
            }
        } else if (event.key === "Enter") {
            enterPressed = true;
        }
    }

    function useKeyBoardNavigationUp(event: KeyboardEvent) {
        if (!wokaData || !currentWokaCollection) return;
        if (event.key === "Enter" && enterPressed) {
            enterPressed = false;
            saveAndContinue([selectedWokaTextureId["woka"]]); // Save and continue when Enter is pressed
        }
    }

    onMount(() => {
        loadWokaData().catch((err) => {
            console.error("Error in onMount while loading Woka data:", err);
        });
        document.addEventListener("keydown", useKeyBoardNavigation);
        document.addEventListener("keyup", useKeyBoardNavigationUp);
    });

    onDestroy(() => {
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
                            selectedTextures={selectedWokaTextureId}
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
                                <IconShuffle font-size="20" class="text-white" />
                                <span>{$LL.woka.selectWoka.randomize()}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col flex-1 h-full min-h-0 min-w-0">
                    <div class="rounded-lg flex flex-col flex-1 min-h-0 min-w-0">
                        <h3 class="text-lg font-semibold capitalize">Woka</h3>
                        <div
                            class="flex-none lg:flex-1 flex flex-col items-start gap-0 min-h-0 min-w-0 max-h-full overflow-y-scroll overflow-x-auto scroll-mask py-[20px]"
                        >
                            {#each wokaData?.["woka"]?.collections || [] as collection, collectionIndex (collection.name)}
                                <p class="text-sm text-gray-500 mb-1 mt-4 p-0">{collection.name}</p>
                                <div
                                    id="woka-line-{collectionIndex}"
                                    class="w-full flex flex-row flex-wrap items-start justify-start gap-3"
                                >
                                    {#each collection.textures || [] as texture (texture.id)}
                                        <button
                                            class="rounded border border-solid box-border p-0 h-fit {selectedWokaTextureId?.woka ===
                                            texture.id
                                                ? 'bg-white/50 border-white'
                                                : 'bg-white/10 hover:bg-white/20 border-transparent'}"
                                            id="woka-{texture.id}"
                                            on:click={() => selectTexture(collectionIndex, texture.id)}
                                        >
                                            <WokaImage
                                                selectedTextures={{ woka: texture.id }}
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
                <button class="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded" on:click={customize}>
                    {$LL.woka.selectWoka.customize()}
                </button>
                <button
                    class="selectCharacterSceneFormSubmit w-full px-4 py-3 bg-secondary text-white rounded hover:bg-secondary-600"
                    on:click={() => saveAndContinue([selectedWokaTextureId["woka"]])}
                >
                    {$LL.woka.selectWoka.continue()}
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
