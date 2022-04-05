<script lang="ts">
    import { fly } from "svelte/transition";
    import {
        desktopCapturerSourcePromiseResolve,
        showDesktopCapturerSourcePicker,
    } from "../../Stores/ScreenSharingStore";
    import { onMount } from "svelte";
    import type { DesktopCapturerSource } from "@wa-preload-app";

    let desktopCapturerSources: DesktopCapturerSource[] = [];

    onMount(async () => {
        if (!window.WAD) {
            throw new Error("This component can only be used in the desktop app");
        }

        desktopCapturerSources = await window.WAD.getDesktopCapturerSources({
            thumbnailSize: {
                height: 176,
                width: 312,
            },
            types: ["screen", "window"],
        });
        console.log("desktopCapturerSources", desktopCapturerSources);
    });

    function selectDesktopCapturerSource(source: DesktopCapturerSource) {
        desktopCapturerSourcePromiseResolve(source);
        close();
    }

    function close() {
        $showDesktopCapturerSourcePicker = false;
    }
</script>

<form class="source-picker nes-container" on:submit|preventDefault={close} transition:fly={{ y: -50, duration: 500 }}>
    <h2>Select a Screen or Window to share!</h2>
    <section class="streams">
        {#each desktopCapturerSources as source}
            <div class="media-box" on:click|preventDefault={() => selectDesktopCapturerSource(source)}>
                <i class="container">
                    <span style="background-color: grey; color: black;">{source.name}</span>
                </i>
                <img width="312px" height="176px" src={source.thumbnailURL} alt={source.name} />
            </div>
        {/each}
    </section>
    <section>
        <button class="nes-btn" on:click|preventDefault={close}>Close</button>
    </section>
</form>

<style lang="scss">
    .source-picker {
        pointer-events: auto;
        background: #eceeee;
        margin-left: auto;
        margin-right: auto;
        left: 0;
        right: 0;
        margin-top: 4%;
        max-height: 80vh;
        max-width: 80vw;
        z-index: 600;
        overflow: auto;
        text-align: center;
        display: flex;
        flex-direction: column;

        h2 {
            font-family: "Press Start 2P";
        }

        section.streams {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            max-height: 60vh;
            overflow-y: scroll;
        }
        .media-box {
            display: flex;
            position: relative;
            width: calc(100% / 3);
            background-color: red;

            i {
                position: absolute;
                min-width: 100px;
                height: auto;
                left: -6px;
                top: calc(100% - 28px);
                text-align: center;
                color: white;
                span {
                    font-size: 14px;
                    margin: 2px;
                    background-color: white;
                    border: solid 3px black;
                    border-radius: 8px;
                    font-style: normal;
                }
            }
        }
    }
</style>
