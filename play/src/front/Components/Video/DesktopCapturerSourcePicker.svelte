<script lang="ts">
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import {
        desktopCapturerSourcePromiseResolve,
        showDesktopCapturerSourcePicker,
    } from "../../Stores/ScreenSharingStore";
    import type { DesktopCapturerSource } from "../../Interfaces/DesktopAppInterfaces";

    let desktopCapturerSources: DesktopCapturerSource[] = [];
    let interval: ReturnType<typeof setInterval>;

    async function getDesktopCapturerSources() {
        if (!window.WAD) {
            throw new Error("This component can only be used in the desktop app");
        }
        desktopCapturerSources = await window.WAD.getDesktopCapturerSources({
            thumbnailSize: {
                height: 144,
                width: 256,
            },
            types: ["screen", "window"],
        });
    }

    onMount(async () => {
        await getDesktopCapturerSources();
        interval = setInterval(() => {
            void getDesktopCapturerSources();
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
</script>

<div class="source-picker" transition:fly={{ y: -50, duration: 500 }}>
    <button type="button" class="btn danger close" on:click={cancel}>&times;</button>
    <h2>Select a Screen or Window to share!</h2>
    <section class="streams">
        {#each desktopCapturerSources as source (source.id)}
            <div class="media-box clickable" on:click|preventDefault={() => selectDesktopCapturerSource(source)}>
                <img src={source.thumbnailURL} alt={source.name} />
                <div class="container">
                    {source.name}
                </div>
            </div>
        {/each}
    </section>
</div>

<style lang="scss">
    .source-picker {
        position: absolute;
        pointer-events: auto;
        background: #eceeee;
        margin-left: auto;
        margin-right: auto;
        left: 0;
        right: 0;
        margin-top: 4%;
        height: 80vh;
        width: 80vw;
        max-width: 1024px;
        z-index: 900;
        text-align: center;
        display: flex;
        flex-direction: column;
        background-color: #333333;
        color: whitesmoke;

        h2 {
            font-family: "Press Start 2P";
        }

        section.streams {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 10px;
            overflow-y: auto;
            justify-content: center;
            align-content: flex-start;
            height: 100%;
        }

        .media-box {
            position: relative;
            padding: 0;
            width: calc(100% / 3 - 20px);
            max-width: 256px;
            padding-bottom: calc(min((100% / 3 - 20px), 256px) * (144px / 256px));
            max-height: 144px;
            justify-content: center;
            background-color: #000;
            background-clip: padding-box;

            &.clickable * {
                cursor: pointer;
            }

            &:hover {
                transform: scale(1.05);
            }

            img {
                position: absolute;
                top: 50%;
                left: 50%;
                max-width: 100%;
                max-height: 100%;
                transform: translate(-50%, -50%);
            }

            div.container {
                position: absolute;
                width: 90%;
                height: auto;
                left: 5%;
                top: calc(100% - 28px);
                text-align: center;
                padding: 2px 36px;

                white-space: nowrap;
                overflow-x: hidden;
                text-overflow: ellipsis;
                font-size: 14px;
                margin: 2px;
                background-color: white;
                color: #333333;
                border: solid 3px black;
                border-radius: 8px;
                font-style: normal;
            }
        }
    }
</style>
