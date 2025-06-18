<script lang="ts">
    import { onMount } from 'svelte';
    import { gameManager } from '../../Phaser/Game/GameManager';
    import { connectionManager } from '../../Connection/ConnectionManager';
    import { selectCharacterCustomizeSceneVisibleStore } from '../../Stores/SelectCharacterStore';
    import { localUserStore } from '../../Connection/LocalUserStore';
    import { ABSOLUTE_PUSHER_URL } from '../../Enum/ComputedConst';
    import { areCharacterTexturesValid } from '../../Connection/LocalUserUtils';
    import { analyticsClient } from '../../Administration/AnalyticsClient';
    import WokaPreview from './WokaPreview.svelte';

    export let game: any;

    // Types pour les couches Woka
    type WokaBodyPart = 'body' | 'eyes' | 'hair' | 'clothes' | 'hat' | 'accessory';
    
    interface WokaTexture {
        id: string;
        name: string;
        url: string;
        position: number;
    }

    interface WokaCollection {
        name: string;
        position: number;
        textures: WokaTexture[];
    }

    interface WokaLayer {
        collections: WokaCollection[];
    }

    interface WokaData {
        body: WokaLayer;
        eyes: WokaLayer;
        hair: WokaLayer;
        clothes: WokaLayer;
        hat: WokaLayer;
        accessory: WokaLayer;
    }

    // État du composant
    let wokaData: WokaData | null = null;
    let selectedBodyPart: WokaBodyPart = 'body';
    let selectedTextures: Record<WokaBodyPart, string> = {
        body: '',
        eyes: '',
        hair: '',
        clothes: '',
        hat: '',
        accessory: ''
    };
    let isLoading = true;
    let error = '';

    // Ordre des couches pour l'assemblage
    const bodyPartOrder: WokaBodyPart[] = ['body', 'eyes', 'hair', 'clothes', 'hat', 'accessory'];

    // Charger les données Woka
    async function loadWokaData() {
        try {
            isLoading = true;
            const roomUrl = gameManager.currentStartedRoom.href;
            const response = await fetch(
                `${ABSOLUTE_PUSHER_URL}/woka/list?roomUrl=${encodeURIComponent(roomUrl)}`,
                {
                    headers: {
                        'Authorization': localUserStore.getAuthToken() || '',
                    },
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error('Failed to load Woka data');
            }

            const data = await response.json();
            wokaData = data;

            // Charger les textures sauvegardées
            loadSavedTextures();

        } catch (err) {
            console.error('Error loading Woka data:', err);
            error = 'Failed to load Woka customization data';
        } finally {
            isLoading = false;
        }
    }

    // Charger les textures sauvegardées
    function loadSavedTextures() {
        try {
            const savedTextureIds = gameManager.getCharacterTextureIds();
            if (savedTextureIds && savedTextureIds.length > 0) {
                bodyPartOrder.forEach((bodyPart, index) => {
                    if (savedTextureIds[index]) {
                        selectedTextures[bodyPart] = savedTextureIds[index];
                    }
                });
            } else {
                bodyPartOrder.forEach(bodyPart => {
                    if (wokaData?.[bodyPart]?.collections?.[0]?.textures?.[0]) {
                        selectedTextures[bodyPart] = wokaData[bodyPart].collections[0].textures[0].id;
                    }
                });
            }
            // Trigger reactivity
            selectedTextures = { ...selectedTextures };
        } catch (err) {
            console.warn('Cannot load previous WOKA textures:', err);
        }
    }

    // Changer une texture
    function selectTexture(bodyPart: WokaBodyPart, textureId: string) {
        selectedTextures[bodyPart] = textureId;
        selectedTextures = { ...selectedTextures };
        console.log(`Selected texture for ${bodyPart}:`, textureId, selectedTextures);
    }

    // Randomiser l'apparence
    function randomizeOutfit() {
        bodyPartOrder.forEach(bodyPart => {
            if (wokaData?.[bodyPart]?.collections?.[0]?.textures) {
                const textures = wokaData[bodyPart].collections[0].textures;
                const randomIndex = Math.floor(Math.random() * textures.length);
                selectedTextures[bodyPart] = textures[randomIndex].id;
            }
        });
        selectedTextures = { ...selectedTextures }; // Trigger reactivity
    }

    // Sauvegarder et continuer
    async function saveAndContinue() {
        try {
            const textureIds = bodyPartOrder.map(bodyPart => selectedTextures[bodyPart]).filter(Boolean);
            
            if (!areCharacterTexturesValid(textureIds)) {
                error = 'Invalid character textures';
                return;
            }

            analyticsClient.validationWoka("CustomizeWoka");

            // Sauvegarder localement
            gameManager.setCharacterTextureIds(textureIds);
            
            // Sauvegarder sur le serveur
            await connectionManager.saveTextures(textureIds);

            // Fermer la scène de customisation
            selectCharacterCustomizeSceneVisibleStore.set(false);

        } catch (err) {
            console.error('Error saving textures:', err);
            error = 'Failed to save character customization';
        }
    }

    // Retourner à la scène précédente
    function goBack() {
        selectCharacterCustomizeSceneVisibleStore.set(false);
    }

    // Obtenir les textures disponibles pour une partie du corps
    function getAvailableTextures(bodyPart: WokaBodyPart): WokaTexture[] {
        return wokaData?.[bodyPart]?.collections?.[0]?.textures || [];
    }

    // Obtenir l'URL complète d'une texture
    function getTextureUrl(relativeUrl: string): string {
        // Si l'URL commence déjà par http/https, c'est une URL absolue
        if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
            return relativeUrl;
        }
        
        // Sinon, c'est une URL relative, on ajoute le préfixe
        return `${ABSOLUTE_PUSHER_URL}/${relativeUrl}`;
    }

    onMount(() => {
        loadWokaData();
    });
</script>

<div class="bg-contrast/80 backdrop-blur w-screen h-screen absolute flex items-center justify-center">
    <div class="rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {#if isLoading}
            <div class="flex items-center justify-center h-64">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        {:else if error}
            <div class="text-center text-red-600 mb-4">
                <p>{error}</p>
                <button 
                    class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    on:click={loadWokaData}
                >
                    Retry
                </button>
            </div>
        {:else}
            <!-- Header -->
            <div class="flex justify-between items-center mb-6">
                <button
                    class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    on:click={goBack}
                >
                    Back
                </button>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Prévisualisation -->
                <div class="lg:col-span-1">
                    <WokaPreview {selectedTextures} {wokaData} {getTextureUrl} />

                    <!-- Boutons d'action -->
                    <div class="mt-4 space-y-2">
                        <button 
                            class="w-full px-4 py-2 bg-white/10 text-white rounded hover:bg-white/10"
                            on:click={randomizeOutfit}
                        >
                            🎲 Randomize
                        </button>
                        <button 
                            class="w-full px-4 py-2 bg-secondary text-white rounded hover:bg-secondary-600"
                            on:click={saveAndContinue}
                        >
                            Finish
                        </button>
                    </div>
                </div>

                <!-- Sélection des parties du corps -->
                <div class="lg:col-span-2">
                    <!-- Onglets des parties du corps -->
                    <div class="flex flex-wrap gap-2 mb-4">
                        {#each bodyPartOrder as bodyPart}
                            <button 
                                class="px-3 py-2 rounded capitalize {selectedBodyPart === bodyPart ? 'bg-secondary text-white' : 'bg-white/10 text-white hover:bg-white/20'}"
                                on:click={() => selectedBodyPart = bodyPart}
                            >
                                {bodyPart}
                            </button>
                        {/each}
                    </div>


                    <div class="rounded-lg p-4">
                        <h3 class="text-lg font-semibold mb-4 capitalize">
                            {selectedBodyPart} Options
                        </h3>
                        <div class="overflow-x-hidden w-full">
                            <div class="flex flex-row w-full overflow-x-scroll gap-3">
                                {#each getAvailableTextures(selectedBodyPart) as texture}
                                    <button
                                        class="p-2 rounded border-2 transition-colors {selectedTextures[selectedBodyPart] === texture.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}"
                                        on:click={() => selectTexture(selectedBodyPart, texture.id)}
                                    >
                                        <div class="p-2 bg-white/10 rounded mb-2 flex items-center justify-center">
                                            <div
                                                class="w-[64px] h-[64px] bg-no-repeat"
                                                style="background-image: url('{getTextureUrl(texture.url)}'); background-size: calc(3 * 64px) calc(4 * 64px); background-position: 0 0; image-rendering: pixelated;"
                                            ></div>
                                        </div>
                                    </button>
                                {/each}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>
