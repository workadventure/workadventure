<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import {
        desktopCapturerSourcePromiseResolve,
        showDesktopCapturerSourcePicker,
    } from "../../Stores/ScreenSharingStore";
    import type { DesktopCapturerSource } from "../../Interfaces/DesktopAppInterfaces";
    import { getDesktopCapturerSourceKind, type DesktopCapturerSourceKind } from "./DesktopCapturerSourcePickerPolicy";

    let desktopCapturerSources: DesktopCapturerSource[] = $state([]);
    let interval: ReturnType<typeof setInterval>;
    let selectedKind: DesktopCapturerSourceKind = $state("screen");
    let loading = $state(true);
    let errorMessage: string | undefined = $state(undefined);

    let visibleSources = $derived(
        desktopCapturerSources.filter((source) => getDesktopCapturerSourceKind(source) === selectedKind),
    );

    async function getDesktopCapturerSources() {
        if (!window.WAD) {
            throw new Error("This component can only be used in the desktop app");
        }
        try {
            errorMessage = undefined;
            const fresh = await window.WAD.getDesktopCapturerSources({
                thumbnailSize: {
                    height: 180,
                    width: 320,
                },
                types: ["screen", "window"],
            });
            // Don't clobber a non-empty list with an empty one: Electron's desktopCapturer
            // occasionally returns [] transiently on macOS under load (or when the main process
            // is busy with a concurrent renegotiation). Retain the last known sources; the next
            // 1s poll will refresh them for real if the user really has no sources.
            if (fresh.length > 0 || desktopCapturerSources.length === 0) {
                desktopCapturerSources = fresh;
            }
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : "Impossible de charger les sources.";
        } finally {
            loading = false;
        }
    }

    onMount(async () => {
        await getDesktopCapturerSources();
        interval = setInterval(() => {
            getDesktopCapturerSources().catch((e) => console.error("Error while getting desktop capturer sources", e));
        }, 1000);
    });

    onDestroy(() => {
        clearInterval(interval);
    });

    function selectDesktopCapturerSource(source: DesktopCapturerSource) {
        if (!desktopCapturerSourcePromiseResolve) {
            throw new Error("desktopCapturerSourcePromiseResolve is not defined");
        }
        desktopCapturerSourcePromiseResolve(source);
        close();
    }

    function cancel() {
        if (!desktopCapturerSourcePromiseResolve) {
            throw new Error("desktopCapturerSourcePromiseResolve is not defined");
        }
        desktopCapturerSourcePromiseResolve(null);
        close();
    }

    function close() {
        $showDesktopCapturerSourcePicker = false;
    }

    function selectKind(kind: DesktopCapturerSourceKind) {
        selectedKind = kind;
    }

    function stopPropagation(event: Event) {
        event.stopPropagation();
    }
</script>

<div class="source-picker-backdrop" role="presentation" onclick={cancel}>
    <div
        class="source-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="desktop-source-picker-title"
        tabindex="-1"
        onclick={stopPropagation}
        onkeydown={stopPropagation}
    >
        <header class="source-picker-header">
            <div>
                <h2 id="desktop-source-picker-title">Partager votre ecran</h2>
                <p>Choisissez ce que les autres participants verront.</p>
            </div>
            <button type="button" class="close-button" aria-label="Fermer" onclick={cancel}>×</button>
        </header>

        <div class="source-picker-tabs" role="tablist" aria-label="Type de source">
            <button
                type="button"
                role="tab"
                aria-selected={selectedKind === "screen"}
                class:active={selectedKind === "screen"}
                onclick={() => selectKind("screen")}
            >
                Ecrans
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={selectedKind === "window"}
                class:active={selectedKind === "window"}
                onclick={() => selectKind("window")}
            >
                Fenetres
            </button>
        </div>

        <div class="source-picker-body">
            {#if loading}
                <div class="source-picker-state">Chargement des sources...</div>
            {:else if errorMessage}
                <div class="source-picker-state error">{errorMessage}</div>
            {:else if visibleSources.length === 0}
                <div class="source-picker-state">Aucune source disponible.</div>
            {:else}
                <div class="source-grid">
                    {#each visibleSources as source (source.id)}
                        <button type="button" class="source-tile" onclick={() => selectDesktopCapturerSource(source)}>
                            <span class="source-thumbnail">
                                <img src={source.thumbnailURL} alt="" draggable="false" />
                            </span>
                            <span class="source-name" title={source.name}>{source.name}</span>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>

        <footer class="source-picker-footer">
            <button type="button" class="secondary-button" onclick={cancel}>Annuler</button>
        </footer>
    </div>
</div>

<style>
    .source-picker-backdrop {
        position: absolute;
        inset: 0;
        z-index: 900;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        pointer-events: auto;
        background: rgb(0 0 0 / 56%);
        backdrop-filter: blur(4px);
    }

    .source-picker {
        display: flex;
        flex-direction: column;
        width: min(1040px, 100%);
        max-height: min(760px, calc(100vh - 48px));
        overflow: hidden;
        color: #f8fafc;
        background: #111827;
        border: 1px solid rgb(255 255 255 / 14%);
        border-radius: 8px;
        box-shadow: 0 24px 80px rgb(0 0 0 / 45%);
    }

    .source-picker-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 20px 24px 14px;
        border-bottom: 1px solid rgb(255 255 255 / 10%);

        h2 {
            margin: 0 0 6px;
            font-family: "Roboto", sans-serif;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0;
        }

        p {
            margin: 0;
            color: #cbd5e1;
            font-size: 14px;
        }
    }

    .close-button,
    .secondary-button,
    .source-picker-tabs button,
    .source-tile {
        border: 0;
        font: inherit;
        cursor: pointer;
    }

    .close-button {
        width: 36px;
        height: 36px;
        flex: none;
        color: #e2e8f0;
        background: rgb(255 255 255 / 10%);
        border-radius: 6px;
        font-size: 24px;
        line-height: 1;
    }

    .close-button:hover,
    .secondary-button:hover,
    .source-picker-tabs button:hover {
        background: rgb(255 255 255 / 16%);
    }

    .source-picker-tabs {
        display: flex;
        gap: 8px;
        padding: 14px 24px 0;
    }

    .source-picker-tabs button {
        min-width: 112px;
        padding: 10px 14px;
        color: #cbd5e1;
        background: rgb(255 255 255 / 8%);
        border-radius: 6px;
        font-weight: 600;
    }

    .source-picker-tabs button.active {
        color: white;
        background: #4353ff;
    }

    .source-picker-body {
        min-height: 280px;
        overflow: auto;
        padding: 18px 24px 24px;
    }

    .source-picker-state {
        display: grid;
        min-height: 260px;
        place-items: center;
        color: #cbd5e1;
        font-size: 15px;
    }

    .source-picker-state.error {
        color: #fecaca;
    }

    .source-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 14px;
    }

    .source-tile {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 10px;
        padding: 10px;
        color: #f8fafc;
        text-align: left;
        background: rgb(255 255 255 / 7%);
        border: 1px solid rgb(255 255 255 / 10%);
        border-radius: 8px;
    }

    .source-tile:hover,
    .source-tile:focus-visible {
        outline: none;
        background: rgb(67 83 255 / 22%);
        border-color: rgb(129 140 248 / 80%);
    }

    .source-thumbnail {
        display: grid;
        width: 100%;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        place-items: center;
        background: #020617;
        border-radius: 6px;
    }

    .source-thumbnail img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    .source-name {
        min-width: 0;
        overflow: hidden;
        color: #e2e8f0;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 14px;
        font-weight: 600;
    }

    .source-picker-footer {
        display: flex;
        justify-content: flex-end;
        padding: 14px 24px 20px;
        border-top: 1px solid rgb(255 255 255 / 10%);
    }

    .secondary-button {
        padding: 10px 14px;
        color: #e2e8f0;
        background: rgb(255 255 255 / 10%);
        border-radius: 6px;
        font-weight: 600;
    }
</style>
